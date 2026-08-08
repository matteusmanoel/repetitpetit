import { isUrgentDeliveryFulfillment } from "@/features/admin/fulfillment/queue-logic";
import type { FulfillmentQueueOrder } from "@/features/admin/fulfillment/types";
import type { FulfillmentType } from "@/features/orders/types";
import type { AdminNotification } from "@/features/admin/notifications/types";

/** Canal curto no body da notificação (ops, não label público de pedido). */
function notifChannelLabel(type: FulfillmentType): string {
  switch (type) {
    case "pickup":
      return "Sacolinha";
    case "delivery":
      return "Entrega";
    case "correios":
      return "Correios";
    case "store_counter":
      return "Balcão";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

/** Dias restantes no `pickup_deadline` para disparar alerta (D127). */
export const SACOLINHA_NEAR_DEADLINE_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

function pieceLabel(count: number): string {
  return count === 1 ? "1 peça" : `${count} peças`;
}

function customerLabel(name: string | null): string {
  const trimmed = name?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "Cliente";
}

/** Relógio HH:mm em America/Sao_Paulo (drawer compacto). */
export function formatNotifClock(
  iso: string | null | undefined,
  nowMs: number = Date.now(),
): string {
  if (!iso) return "agora";
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "agora";

    const sameDay =
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date) ===
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(nowMs));

    if (sameDay) {
      return new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    }

    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
    }).format(date);
  } catch {
    return "agora";
  }
}

function formatDeadlineHint(
  deadlineIso: string,
  nowMs: number,
): string {
  const remaining = new Date(deadlineIso).getTime() - nowMs;
  if (remaining <= 0) return "prazo vencido";

  const days = Math.ceil(remaining / DAY_MS);
  if (days <= 1) return "retirar até amanhã";
  return `retirar em até ${days} dias`;
}

export function isSacolinhaNearDeadline(
  pickupDeadline: string | null | undefined,
  nowMs: number = Date.now(),
  nearDays: number = SACOLINHA_NEAR_DEADLINE_DAYS,
): boolean {
  if (!pickupDeadline) return false;
  const deadlineMs = new Date(pickupDeadline).getTime();
  if (Number.isNaN(deadlineMs)) return false;
  const remaining = deadlineMs - nowMs;
  // Já vencido ou dentro da janela.
  return remaining <= nearDays * DAY_MS;
}

/**
 * Monta a lista priorizada a partir da fila de fulfillment (paid + em progresso).
 * Um pedido gera no máximo um alerta (prioridade exclusiva).
 */
export function buildAdminNotifications(
  orders: readonly FulfillmentQueueOrder[],
  options?: {
    nowMs?: number;
    dismissedIds?: ReadonlySet<string>;
    nearDeadlineDays?: number;
  },
): AdminNotification[] {
  const nowMs = options?.nowMs ?? Date.now();
  const dismissed = options?.dismissedIds ?? new Set<string>();
  const nearDays = options?.nearDeadlineDays ?? SACOLINHA_NEAR_DEADLINE_DAYS;

  const notifications: AdminNotification[] = [];

  for (const order of orders) {
    const customer = customerLabel(order.customerName);
    const pieces = pieceLabel(order.itemCount);
    const anchor = order.paidAt ?? order.createdAt;
    const href = "/admin/pedidos";

    if (isUrgentDeliveryFulfillment(order.fulfillmentType)) {
      const id = `urgent:${order.id}`;
      if (!dismissed.has(id)) {
        notifications.push({
          id,
          kind: "urgent_delivery",
          priority: 1,
          orderId: order.id,
          publicCode: order.publicCode,
          title: "Entrega urgente",
          body: `${customer} · ${pieces}`,
          at: formatNotifClock(anchor, nowMs),
          sortAt: anchor,
          href,
        });
      }
      continue;
    }

    if (order.status === "paid") {
      const id = `paid:${order.id}`;
      if (!dismissed.has(id)) {
        const channel = notifChannelLabel(order.fulfillmentType);
        notifications.push({
          id,
          kind: "new_paid_sale",
          priority: 2,
          orderId: order.id,
          publicCode: order.publicCode,
          title: "Venda nova",
          body: `${customer} · ${channel} · ${pieces}`,
          at: formatNotifClock(anchor, nowMs),
          sortAt: anchor,
          href,
        });
      }
      continue;
    }

    if (
      order.status === "na_sacolinha" &&
      isSacolinhaNearDeadline(order.pickupDeadline, nowMs, nearDays)
    ) {
      const id = `sacolinha:${order.id}`;
      if (!dismissed.has(id)) {
        const hint = order.pickupDeadline
          ? formatDeadlineHint(order.pickupDeadline, nowMs)
          : "prazo curto";
        notifications.push({
          id,
          kind: "sacolinha_deadline",
          priority: 3,
          orderId: order.id,
          publicCode: order.publicCode,
          title: "Sacolinha — prazo curto",
          body: `${customer} · ${hint}`,
          at: formatNotifClock(order.pickupDeadline, nowMs),
          sortAt: order.pickupDeadline ?? anchor,
          href,
        });
      }
    }
  }

  return notifications.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.sortAt.localeCompare(a.sortAt);
  });
}
