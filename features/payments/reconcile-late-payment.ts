import "server-only";

import {
  stubMercadoPagoRefund,
  type RefundMercadoPagoPaymentFn,
} from "@/lib/mercado-pago/create-refund";
import type { MercadoPagoPayment } from "@/lib/mercado-pago/fetch-payment";
import type { Database, Json } from "@/lib/supabase/types";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

type OrderStatus = Database["public"]["Enums"]["order_status"];
type PaymentStatus = Database["public"]["Enums"]["payment_status"];

export type ReconcileLatePaymentOrder = {
  id: string;
  public_code: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  mp_payment_id: string | null;
};

export type ReconcileLatePaymentSuccess = {
  ok: true;
  outcome: "reconciled_after_override" | "noop";
  orderId: string;
  publicCode: string;
  refundStubbed: boolean;
};

export type ReconcileLatePaymentFailure = {
  ok: false;
  error: string;
  code: "db";
};

export type ReconcileLatePaymentResult =
  | ReconcileLatePaymentSuccess
  | ReconcileLatePaymentFailure;

export type ReconcileLatePaymentDeps = {
  supabase?: ReturnType<typeof createServiceSupabaseClient>;
  refund?: RefundMercadoPagoPaymentFn;
};

/**
 * Late Mercado Pago webhook after the order was cancelled (Override or admin).
 *
 * D62 / D83:
 * 1. Mark payments row cancelled + note in `raw_payload_json`
 * 2. Stub/call MP Refunds API (default: stub with clear log — no silent fail)
 * 3. Insert `order_events.late_webhook_reconciled`
 * 4. Never mark products sold
 * 5. Stub customer notification (log intent; WhatsApp is Slice N+1)
 *
 * Idempotent: second call with existing `late_webhook_reconciled` → `noop`.
 */
export async function reconcileLatePayment(
  order: ReconcileLatePaymentOrder,
  payment: MercadoPagoPayment,
  deps: ReconcileLatePaymentDeps = {},
): Promise<ReconcileLatePaymentResult> {
  const supabase = deps.supabase ?? createServiceSupabaseClient();
  const refundFn = deps.refund ?? stubMercadoPagoRefund;
  const nowIso = new Date().toISOString();
  const mpPaymentId = payment.id;

  const { data: priorEvent, error: priorError } = await supabase
    .from("order_events")
    .select("id")
    .eq("order_id", order.id)
    .eq("event_type", "late_webhook_reconciled")
    .limit(1)
    .maybeSingle();

  if (priorError) {
    console.error("reconcileLatePayment prior event lookup:", priorError);
    return {
      ok: false,
      error: "Não foi possível verificar reconciliação anterior.",
      code: "db",
    };
  }

  if (priorEvent) {
    return {
      ok: true,
      outcome: "noop",
      orderId: order.id,
      publicCode: order.public_code,
      refundStubbed: true,
    };
  }

  const refundResult = await refundFn(mpPaymentId);
  if (!refundResult.ok) {
    // No silent fail — log loudly; still persist reconcile so inventory stays safe.
    console.error(
      `[SN-06] reconcileLatePayment refund failed order=${order.public_code} ` +
        `payment_id=${mpPaymentId}: ${refundResult.error}`,
    );
  } else if (refundResult.stubbed) {
    console.warn(
      `[SN-06] reconcileLatePayment refund stubbed order=${order.public_code} ` +
        `payment_id=${mpPaymentId}`,
    );
  }

  const paymentNote = {
    sn06_late_webhook_reconcile: {
      at: nowIso,
      reason: "order_cancelled_before_paid_webhook",
      mp_payment_id: mpPaymentId,
      mp_status: payment.status,
      refund: refundResult.ok
        ? {
            ok: true,
            stubbed: refundResult.stubbed,
            refund_id: refundResult.refundId,
          }
        : { ok: false, error: refundResult.error },
    },
    mp_payment: payment.raw ?? null,
  } satisfies Record<string, unknown>;

  await upsertCancelledPaymentRow(
    supabase,
    order.id,
    payment,
    paymentNote,
    nowIso,
  );

  const { error: orderError } = await supabase
    .from("orders")
    .update({
      payment_status: "cancelled",
      mp_payment_id: mpPaymentId,
      updated_at: nowIso,
    })
    .eq("id", order.id)
    .eq("status", "cancelled");

  if (orderError) {
    console.error("reconcileLatePayment order update:", orderError);
    return {
      ok: false,
      error: "Não foi possível reconciliar o pagamento tardio.",
      code: "db",
    };
  }

  const { error: eventError } = await supabase.from("order_events").insert({
    order_id: order.id,
    event_type: "late_webhook_reconciled",
    old_value: order.status,
    new_value: "cancelled",
    actor_type: "system",
    notes:
      `Late MP webhook after cancel/override; payment_id=${mpPaymentId}; ` +
      `refund=${refundResult.ok ? (refundResult.stubbed ? "stubbed" : "requested") : "failed"}`,
  });

  if (eventError) {
    console.error("reconcileLatePayment order_events:", eventError);
    return {
      ok: false,
      error: "Não foi possível gravar o evento de reconciliação.",
      code: "db",
    };
  }

  // Slice N+1: WhatsApp / customer notify. Log intent only.
  console.info(
    `[SN-06] stub customer notify — late payment reconciled for order ` +
      `${order.public_code} (payment_id=${mpPaymentId}); WhatsApp deferred`,
  );

  // Explicit: do NOT call markProductsSoldForOrder / applyInventoryTransition.

  return {
    ok: true,
    outcome: "reconciled_after_override",
    orderId: order.id,
    publicCode: order.public_code,
    refundStubbed: !refundResult.ok || refundResult.stubbed,
  };
}

async function upsertCancelledPaymentRow(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  orderId: string,
  payment: MercadoPagoPayment,
  notePayload: Record<string, unknown>,
  nowIso: string,
): Promise<void> {
  const { data: existing } = await supabase
    .from("payments")
    .select("id, raw_payload_json")
    .eq("order_id", orderId)
    .eq("provider", "mercado_pago")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const payload = {
    provider_payment_id: payment.id,
    provider_preference_id: payment.preferenceId,
    status: "cancelled" as const,
    amount: payment.transactionAmount ?? undefined,
    paid_at: null,
    raw_payload_json: notePayload as Json,
    updated_at: nowIso,
  };

  if (existing) {
    const { error } = await supabase
      .from("payments")
      .update(payload)
      .eq("id", existing.id);
    if (error) console.error("reconcileLatePayment payment update:", error);
    return;
  }

  const { error } = await supabase.from("payments").insert({
    order_id: orderId,
    provider: "mercado_pago",
    ...payload,
    amount: payment.transactionAmount ?? 0,
  });
  if (error) console.error("reconcileLatePayment payment insert:", error);
}
