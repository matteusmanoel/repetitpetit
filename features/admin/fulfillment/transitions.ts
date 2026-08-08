import type { OrderStatus } from "@/features/orders/types";

/** Dias até o deadline de retirada após marcar na_sacolinha (D105 / SO-05). */
export const SACOLINHA_PICKUP_DEADLINE_DAYS = 30;

/** Status que o admin pode aplicar nas ações de fulfillment (T20 / #125). */
export type FulfillmentTargetStatus =
  | "confirmed"
  | "ready_for_pickup"
  | "na_sacolinha"
  | "shipped"
  | "completed"
  | "cancelled";

export type FulfillmentTransitionPlan =
  | { kind: "idempotent"; status: FulfillmentTargetStatus }
  | {
      kind: "apply";
      from: OrderStatus;
      to: FulfillmentTargetStatus;
      requiresTracking: boolean;
      setConfirmedAt: boolean;
      setCancelledAt: boolean;
      setCompletedAt: boolean;
      setTrackingCode: boolean;
      /** Grava ready_since + pickup_deadline (Sacolinha / D105). */
      setReadyTimestamps: boolean;
    }
  | { kind: "denied"; reason: string };

const ALLOWED_FROM: Record<FulfillmentTargetStatus, readonly OrderStatus[]> = {
  confirmed: ["paid"],
  ready_for_pickup: ["confirmed"],
  na_sacolinha: ["confirmed"],
  shipped: ["confirmed"],
  completed: ["ready_for_pickup", "na_sacolinha", "shipped"],
  cancelled: ["paid", "confirmed"],
};

const DENIED_MESSAGES: Record<FulfillmentTargetStatus, string> = {
  confirmed: "Só é possível conferir pedidos com pagamento confirmado.",
  ready_for_pickup:
    "Só é possível marcar como pronto pedidos que estão em separação.",
  na_sacolinha:
    "Só é possível colocar na sacolinha pedidos que estão em separação.",
  shipped: "Só é possível marcar como enviado pedidos que estão em separação.",
  completed:
    "Só é possível concluir pedidos na sacolinha, prontos para retirada ou já enviados.",
  cancelled: "Só é possível cancelar pedidos pagos ou em separação.",
};

/**
 * Plano puro de transição de fulfillment — testável sem Supabase.
 * Idempotente: se já está no alvo, não aplica segunda escrita/evento.
 */
export function planFulfillmentTransition(
  current: OrderStatus,
  target: FulfillmentTargetStatus,
): FulfillmentTransitionPlan {
  if (current === target) {
    return { kind: "idempotent", status: target };
  }

  const allowedFrom = ALLOWED_FROM[target];
  if (!allowedFrom.includes(current)) {
    return { kind: "denied", reason: DENIED_MESSAGES[target] };
  }

  return {
    kind: "apply",
    from: current,
    to: target,
    requiresTracking: target === "shipped",
    setConfirmedAt: target === "confirmed",
    setCancelledAt: target === "cancelled",
    setCompletedAt: target === "completed",
    setTrackingCode: target === "shipped",
    setReadyTimestamps: target === "na_sacolinha",
  };
}

/** Status exibidos na seção "Em separação / envio". */
export const IN_PROGRESS_STATUSES: readonly OrderStatus[] = [
  "confirmed",
  "ready_for_pickup",
  "na_sacolinha",
  "shipped",
] as const;

export function isInProgressStatus(status: OrderStatus | string): boolean {
  return (IN_PROGRESS_STATUSES as readonly string[]).includes(status);
}

/** Calcula pickup_deadline a partir de ready_since (UTC ISO). */
export function computePickupDeadlineIso(
  readySinceIso: string,
  days: number = SACOLINHA_PICKUP_DEADLINE_DAYS,
): string {
  const ready = new Date(readySinceIso);
  ready.setUTCDate(ready.getUTCDate() + days);
  return ready.toISOString();
}
