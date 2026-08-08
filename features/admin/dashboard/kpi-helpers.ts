import type { OpsChannel } from "@/features/admin/dashboard/ops-channel";
import type { DashboardDayChannelBucket } from "@/features/admin/dashboard/types";

/** Holds com menos de 5 minutos até `expires_at` entram no widget "Expirando em breve". */
export const HOLD_EXPIRING_SOON_MS = 5 * 60 * 1000;

const BRT_DAY_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const BRT_WEEKDAY_SHORT = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  weekday: "short",
});

const BRT_DAY_MONTH = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
});

function saoPauloCivilParts(now: Date): {
  year: number;
  month: number;
  day: number;
} {
  const parts = BRT_DAY_PARTS.formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);

  if (!year || !month || !day) {
    throw new Error("Falha ao calcular o dia civil em America/Sao_Paulo.");
  }

  return { year, month, day };
}

/**
 * Limites do dia civil em America/Sao_Paulo (BRT, UTC−3 sem DST desde 2019).
 * Intervalo semiaberto: `[startIso, nextDayStartIso)`.
 */
export function getSaoPauloDayBounds(now: Date = new Date()): {
  startIso: string;
  nextDayStartIso: string;
} {
  const { year, month, day } = saoPauloCivilParts(now);

  // 00:00 BRT = 03:00 UTC
  const startMs = Date.UTC(year, month - 1, day, 3, 0, 0, 0);
  const nextMs = Date.UTC(year, month - 1, day + 1, 3, 0, 0, 0);

  return {
    startIso: new Date(startMs).toISOString(),
    nextDayStartIso: new Date(nextMs).toISOString(),
  };
}

/** Corte superior inclusivo para holds que expiram em breve. */
export function getHoldExpiringSoonCutoff(now: Date = new Date()): string {
  return new Date(now.getTime() + HOLD_EXPIRING_SOON_MS).toISOString();
}

/** Chave `YYYY-MM-DD` do instante no fuso America/Sao_Paulo. */
export function getSaoPauloDateKey(isoOrDate: string | Date): string {
  const date =
    typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  const { year, month, day } = saoPauloCivilParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Limite inferior (BRT midnight → UTC ISO) para os últimos `dayCount` dias
 * civis inclusive o dia atual.
 */
export function getSaoPauloRangeStartIso(
  dayCount: number,
  now: Date = new Date(),
): string {
  if (dayCount < 1) {
    throw new Error("dayCount deve ser >= 1");
  }
  const { year, month, day } = saoPauloCivilParts(now);
  const startMs = Date.UTC(year, month - 1, day - (dayCount - 1), 3, 0, 0, 0);
  return new Date(startMs).toISOString();
}

export type PaidOrderForSeries = {
  paidAt: string;
  totalAmount: number;
  channel: OpsChannel;
};

function dayLabelForKey(dayKey: string, mode: "weekday" | "dayMonth"): string {
  // Meio-dia UTC no dia BRT evita edge de DST (inexistente) / parsing local.
  const noonUtc = new Date(`${dayKey}T15:00:00.000Z`);
  if (mode === "weekday") {
    const raw = BRT_WEEKDAY_SHORT.format(noonUtc);
    return raw.replace(".", "").slice(0, 3);
  }
  return BRT_DAY_MONTH.format(noonUtc);
}

/**
 * Monta buckets diários vazios (últimos N dias BRT) e soma `totalAmount`
 * por canal. Valores em R$ (mesmo unidade de `orders.total_amount`).
 */
export function buildChannelDaySeries(
  orders: readonly PaidOrderForSeries[],
  dayCount: 7 | 30,
  now: Date = new Date(),
): DashboardDayChannelBucket[] {
  const { year, month, day } = saoPauloCivilParts(now);
  const labelMode = dayCount <= 7 ? "weekday" : "dayMonth";
  const buckets: DashboardDayChannelBucket[] = [];
  const indexByKey = new Map<string, number>();

  for (let offset = dayCount - 1; offset >= 0; offset -= 1) {
    const ms = Date.UTC(year, month - 1, day - offset, 15, 0, 0, 0);
    const dayKey = getSaoPauloDateKey(new Date(ms));
    indexByKey.set(dayKey, buckets.length);
    buckets.push({
      dayKey,
      dayLabel: dayLabelForKey(dayKey, labelMode),
      sacolinha: 0,
      entrega: 0,
      balcao: 0,
    });
  }

  for (const order of orders) {
    const key = getSaoPauloDateKey(order.paidAt);
    const idx = indexByKey.get(key);
    if (idx === undefined) continue;
    const bucket = buckets[idx];
    if (!bucket) continue;
    bucket[order.channel] += order.totalAmount;
  }

  return buckets;
}

/**
 * Estimativa determinística de acessos (sem instrumentação).
 * Não representa tráfego real — só preenche o chart com label honesto.
 */
export function buildAccessMockSeries(
  dayKeys: readonly string[],
): { dayKey: string; dayLabel: string; value: number }[] {
  return dayKeys.map((dayKey) => {
    let hash = 0;
    for (let i = 0; i < dayKey.length; i += 1) {
      hash = (hash * 31 + dayKey.charCodeAt(i)) >>> 0;
    }
    const value = 160 + (hash % 520);
    const labelMode = dayKeys.length <= 7 ? "weekday" : "dayMonth";
    return {
      dayKey,
      dayLabel: dayLabelForKey(dayKey, labelMode),
      value,
    };
  });
}

export type TopCustomerAggregateInput = {
  customerId: string;
  customerName: string;
  totalAmount: number;
};

/**
 * Agrega top clientes por `customerId` (soma R$ + contagem de pedidos).
 */
export function aggregateTopCustomers(
  rows: readonly TopCustomerAggregateInput[],
  limit = 5,
): { customerId: string; name: string; orders: number; totalAmount: number }[] {
  const map = new Map<
    string,
    { customerId: string; name: string; orders: number; totalAmount: number }
  >();

  for (const row of rows) {
    const existing = map.get(row.customerId);
    if (existing) {
      existing.orders += 1;
      existing.totalAmount += row.totalAmount;
      continue;
    }
    map.set(row.customerId, {
      customerId: row.customerId,
      name: row.customerName.trim() || "Cliente",
      orders: 1,
      totalAmount: row.totalAmount,
    });
  }

  return [...map.values()]
    .sort((a, b) => b.totalAmount - a.totalAmount || b.orders - a.orders)
    .slice(0, limit);
}
