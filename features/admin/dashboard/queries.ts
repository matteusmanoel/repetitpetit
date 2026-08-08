import "server-only";

import {
  aggregateTopCustomers,
  buildAccessMockSeries,
  buildChannelDaySeries,
  getHoldExpiringSoonCutoff,
  getSaoPauloDayBounds,
  getSaoPauloRangeStartIso,
  type PaidOrderForSeries,
} from "@/features/admin/dashboard/kpi-helpers";
import { classifyOpsChannel } from "@/features/admin/dashboard/ops-channel";
import type {
  AdminDashboardCharts,
  AdminDashboardKpis,
} from "@/features/admin/dashboard/types";
import type { FulfillmentType } from "@/features/orders/types";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

async function countProductsByStatus(
  status: "available" | "sold",
): Promise<number> {
  const supabase = createServiceSupabaseClient();

  const { count, error } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("status", status);

  if (error) {
    throw new Error(`Falha ao contar produtos (${status}): ${error.message}`);
  }

  return count ?? 0;
}

/**
 * Conta Hold Sessions ativas ainda válidas (`status = active` e
 * `expires_at > now()`). Fonte de verdade do KPI "Holds ativos" (D66) —
 * não usa `cart_reservations` nem `products.status = hold`.
 */
async function countActiveHolds(): Promise<number> {
  const supabase = createServiceSupabaseClient();
  const nowIso = new Date().toISOString();

  const { count, error } = await supabase
    .from("hold_sessions")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .gt("expires_at", nowIso);

  if (error) {
    throw new Error(`Falha ao contar holds ativas: ${error.message}`);
  }

  return count ?? 0;
}

/**
 * Holds ativas com expiração em ≤ 5 minutos (inclui já vencidas ainda
 * `active` — urgência operacional até o cron SN-03).
 */
async function countHoldsExpiringSoon(): Promise<number> {
  const supabase = createServiceSupabaseClient();
  const soonIso = getHoldExpiringSoonCutoff();

  const { count, error } = await supabase
    .from("hold_sessions")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .lte("expires_at", soonIso);

  if (error) {
    throw new Error(`Falha ao contar holds expirando: ${error.message}`);
  }

  return count ?? 0;
}

async function countOrdersByStatus(
  status: "paid" | "confirmed" | "shipped" | "na_sacolinha",
): Promise<number> {
  const supabase = createServiceSupabaseClient();

  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("status", status);

  if (error) {
    throw new Error(`Falha ao contar pedidos (${status}): ${error.message}`);
  }

  return count ?? 0;
}

async function countStoreOrdersToday(): Promise<number> {
  const supabase = createServiceSupabaseClient();
  const { startIso, nextDayStartIso } = getSaoPauloDayBounds();

  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("channel", "store")
    .gte("created_at", startIso)
    .lt("created_at", nextDayStartIso);

  if (error) {
    throw new Error(`Falha ao contar vendas loja hoje: ${error.message}`);
  }

  return count ?? 0;
}

async function countOverridesToday(): Promise<number> {
  const supabase = createServiceSupabaseClient();
  const { startIso, nextDayStartIso } = getSaoPauloDayBounds();

  const { count, error } = await supabase
    .from("override_events")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startIso)
    .lt("created_at", nextDayStartIso);

  if (error) {
    throw new Error(`Falha ao contar overrides hoje: ${error.message}`);
  }

  return count ?? 0;
}

type PaidOrderRow = {
  paid_at: string | null;
  total_amount: number;
  channel: string;
  fulfillment_type: FulfillmentType;
  customer_id: string | null;
  customers: { full_name: string } | { full_name: string }[] | null;
};

function customerNameFromRow(row: PaidOrderRow): string | null {
  if (!row.customer_id) return null;
  const c = row.customers;
  if (!c) return null;
  if (Array.isArray(c)) return c[0]?.full_name ?? null;
  return c.full_name;
}

/**
 * Pedidos com `paid_at` nos últimos 30 dias BRT — base para séries e top clientes.
 */
async function fetchPaidOrdersLast30Days(): Promise<PaidOrderRow[]> {
  const supabase = createServiceSupabaseClient();
  const rangeStart = getSaoPauloRangeStartIso(30);

  const { data, error } = await supabase
    .from("orders")
    .select(
      "paid_at, total_amount, channel, fulfillment_type, customer_id, customers ( full_name )",
    )
    .not("paid_at", "is", null)
    .gte("paid_at", rangeStart)
    .order("paid_at", { ascending: true });

  if (error) {
    throw new Error(
      `Falha ao carregar pedidos pagos (30d): ${error.message}`,
    );
  }

  return (data ?? []) as PaidOrderRow[];
}

function sumSalesToday(rows: readonly PaidOrderRow[]): number {
  const { startIso, nextDayStartIso } = getSaoPauloDayBounds();
  let sum = 0;
  for (const row of rows) {
    if (!row.paid_at) continue;
    if (row.paid_at < startIso || row.paid_at >= nextDayStartIso) continue;
    sum += Number(row.total_amount) || 0;
  }
  return sum;
}

function toSeriesOrders(rows: readonly PaidOrderRow[]): PaidOrderForSeries[] {
  const out: PaidOrderForSeries[] = [];
  for (const row of rows) {
    if (!row.paid_at) continue;
    out.push({
      paidAt: row.paid_at,
      totalAmount: Number(row.total_amount) || 0,
      channel: classifyOpsChannel(row.channel, row.fulfillment_type),
    });
  }
  return out;
}

/**
 * Agrega os KPIs do `/admin` via service role (bypass RLS).
 * O layout `(protected)` já garante sessão admin antes desta página.
 */
export async function getAdminDashboardKpis(): Promise<AdminDashboardKpis> {
  const [base, paidRows, ordersNaSacolinha] = await Promise.all([
    Promise.all([
      countProductsByStatus("available"),
      countActiveHolds(),
      countHoldsExpiringSoon(),
      countProductsByStatus("sold"),
      countOrdersByStatus("paid"),
      countOrdersByStatus("confirmed"),
      countOrdersByStatus("shipped"),
      countStoreOrdersToday(),
      countOverridesToday(),
    ]),
    fetchPaidOrdersLast30Days(),
    countOrdersByStatus("na_sacolinha"),
  ]);

  const [
    productsAvailable,
    activeHolds,
    holdsExpiringSoon,
    productsSold,
    ordersPaid,
    ordersConfirmed,
    ordersShipped,
    storeOrdersToday,
    overridesToday,
  ] = base;

  return {
    productsAvailable,
    activeHolds,
    holdsExpiringSoon,
    productsSold,
    ordersPaid,
    ordersConfirmed,
    ordersShipped,
    storeOrdersToday,
    overridesToday,
    salesTodayAmount: sumSalesToday(paidRows),
    ordersNaSacolinha,
  };
}

/**
 * Séries 7/30, mix de canais (via buckets) e top clientes a partir de pedidos
 * pagos. Acessos = mock determinístico com label honesto na UI.
 */
export async function getAdminDashboardCharts(): Promise<AdminDashboardCharts> {
  const paidRows = await fetchPaidOrdersLast30Days();
  const seriesOrders = toSeriesOrders(paidRows);
  const now = new Date();

  const series7d = buildChannelDaySeries(seriesOrders, 7, now);
  const series30d = buildChannelDaySeries(seriesOrders, 30, now);

  const topInput = paidRows.flatMap((row) => {
    if (!row.customer_id || !row.paid_at) return [];
    const name = customerNameFromRow(row);
    if (!name) return [];
    return [
      {
        customerId: row.customer_id,
        customerName: name,
        totalAmount: Number(row.total_amount) || 0,
      },
    ];
  });

  return {
    series7d,
    series30d,
    accessMock7d: buildAccessMockSeries(series7d.map((d) => d.dayKey)),
    accessMock30d: buildAccessMockSeries(series30d.map((d) => d.dayKey)),
    topCustomers: aggregateTopCustomers(topInput, 5),
  };
}

/**
 * Uma ida ao banco de pedidos pagos para KPIs + charts (evita fetch duplicado).
 */
export async function getAdminDashboardData(): Promise<{
  kpis: AdminDashboardKpis;
  charts: AdminDashboardCharts;
}> {
  const [counts, paidRows] = await Promise.all([
    Promise.all([
      countProductsByStatus("available"),
      countActiveHolds(),
      countHoldsExpiringSoon(),
      countProductsByStatus("sold"),
      countOrdersByStatus("paid"),
      countOrdersByStatus("confirmed"),
      countOrdersByStatus("shipped"),
      countStoreOrdersToday(),
      countOverridesToday(),
      countOrdersByStatus("na_sacolinha"),
    ]),
    fetchPaidOrdersLast30Days(),
  ]);

  const [
    productsAvailable,
    activeHolds,
    holdsExpiringSoon,
    productsSold,
    ordersPaid,
    ordersConfirmed,
    ordersShipped,
    storeOrdersToday,
    overridesToday,
    ordersNaSacolinha,
  ] = counts;

  const seriesOrders = toSeriesOrders(paidRows);
  const now = new Date();
  const series7d = buildChannelDaySeries(seriesOrders, 7, now);
  const series30d = buildChannelDaySeries(seriesOrders, 30, now);

  const topInput = paidRows.flatMap((row) => {
    if (!row.customer_id || !row.paid_at) return [];
    const name = customerNameFromRow(row);
    if (!name) return [];
    return [
      {
        customerId: row.customer_id,
        customerName: name,
        totalAmount: Number(row.total_amount) || 0,
      },
    ];
  });

  return {
    kpis: {
      productsAvailable,
      activeHolds,
      holdsExpiringSoon,
      productsSold,
      ordersPaid,
      ordersConfirmed,
      ordersShipped,
      storeOrdersToday,
      overridesToday,
      salesTodayAmount: sumSalesToday(paidRows),
      ordersNaSacolinha,
    },
    charts: {
      series7d,
      series30d,
      accessMock7d: buildAccessMockSeries(series7d.map((d) => d.dayKey)),
      accessMock30d: buildAccessMockSeries(series30d.map((d) => d.dayKey)),
      topCustomers: aggregateTopCustomers(topInput, 5),
    },
  };
}
