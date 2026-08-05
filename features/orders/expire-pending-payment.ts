import "server-only";

import { PENDING_PAYMENT_TTL_MINUTES } from "@/features/orders/constants";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

export type ExpireDuePendingPaymentResult = {
  status: string;
  expired_count: number;
  failed_count: number;
  order_ids: string[];
};

export type PlanPendingPaymentExpireInput = {
  status: string;
  channel: string;
  expiresAt: string | null;
  nowMs?: number;
};

/**
 * Pure gate: should this online pending_payment row be cancelled by the TTL job?
 * Mirrors SQL predicates on `expire_due_pending_payment_orders` (issue #99).
 */
export function planPendingPaymentExpire(
  input: PlanPendingPaymentExpireInput,
): "expire" | "skip" {
  if (input.status !== "pending_payment") return "skip";
  if (input.channel !== "online") return "skip";
  if (!input.expiresAt) return "skip";

  const expiresMs = Date.parse(input.expiresAt);
  if (Number.isNaN(expiresMs)) return "skip";

  const nowMs = input.nowMs ?? Date.now();
  return expiresMs <= nowMs ? "expire" : "skip";
}

/**
 * Expected post-expire order + inventory outcome (contracts SN-02 / SN-05 / SN-06).
 * Late MP webhook after this must hit `reconcileLatePayment` — never sold.
 */
export function planPendingPaymentExpireOutcome(): {
  orderStatus: "cancelled";
  paymentStatus: "cancelled";
  eventType: "cancelled_by_payment_ttl";
  inventory: "available_via_sn02";
  lateWebhook: "reconcile_late_payment";
  ttlMinutes: typeof PENDING_PAYMENT_TTL_MINUTES;
} {
  return {
    orderStatus: "cancelled",
    paymentStatus: "cancelled",
    eventType: "cancelled_by_payment_ttl",
    inventory: "available_via_sn02",
    lateWebhook: "reconcile_late_payment",
    ttlMinutes: PENDING_PAYMENT_TTL_MINUTES,
  };
}

/**
 * Service-role wrapper around `expire_due_pending_payment_orders` (pg_cron primary).
 */
export async function expireDuePendingPaymentOrders(): Promise<ExpireDuePendingPaymentResult> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.rpc(
    "expire_due_pending_payment_orders",
  );

  if (error) {
    console.error("expire_due_pending_payment_orders failed:", error);
    throw new Error("Falha ao expirar pedidos pending_payment.");
  }

  const payload = (data ?? {}) as Partial<ExpireDuePendingPaymentResult>;
  return {
    status: payload.status ?? "ok",
    expired_count: payload.expired_count ?? 0,
    failed_count: payload.failed_count ?? 0,
    order_ids: payload.order_ids ?? [],
  };
}
