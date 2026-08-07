import type { Database } from "@/lib/supabase/types";
import { isOrderPastPendingPayment } from "@/lib/mercado-pago/map-payment-status";

type OrderStatus = Database["public"]["Enums"]["order_status"];

export type OverrideGateResult =
  | { ok: true }
  | { ok: false; reason: "already_paid" };

/**
 * Pure gate for SN-13 Override (D62 / D83).
 *
 * Call **inside the same DB transaction** as the override insert, after
 * `SELECT … FOR UPDATE` on the product and (when present) the online order.
 *
 * - Hold Session only (no order) → allowed.
 * - `pending_payment` → allowed (Override may cancel the claim).
 * - `paid` or any post-payment fulfillment status → blocked (`already_paid`).
 *
 * SN-13 `executeOverrideAction` MUST call this before releasing hold /
 * cancelling the order / inserting `override_events`. Do not reimplement.
 */
export function assertOverrideAllowed(
  order: { status: OrderStatus } | null | undefined,
): OverrideGateResult {
  if (!order) {
    return { ok: true };
  }

  // Issue AC: paid → already_paid. Also block confirmed/ready/sacolinha/shipped/completed
  // (same inventory priority — payment already won).
  if (order.status === "paid" || isOrderPastPendingPayment(order.status)) {
    return { ok: false, reason: "already_paid" };
  }

  return { ok: true };
}
