import "server-only";

import { convertHoldSession } from "@/features/cart/hold-session";
import { markProductsSoldForOrder } from "@/features/inventory/apply-transition";
import { reconcileLatePayment } from "@/features/payments/reconcile-late-payment";
import type { MercadoPagoPayment } from "@/lib/mercado-pago/fetch-payment";
import {
  isOrderPastPendingPayment,
  mapMercadoPagoPaymentStatus,
  type PaymentStatus,
} from "@/lib/mercado-pago/map-payment-status";
import type { Database, Json } from "@/lib/supabase/types";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

type OrderStatus = Database["public"]["Enums"]["order_status"];

export type ApplyMpStatusSuccess = {
  ok: true;
  outcome:
    | "applied_paid"
    | "already_paid"
    | "payment_updated"
    | "noop"
    | "reconciled_after_override";
  orderId: string;
  publicCode: string;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
};

export type ApplyMpStatusFailure = {
  ok: false;
  error: string;
  code: "not_found" | "db" | "invalid";
};

export type ApplyMpStatusResult = ApplyMpStatusSuccess | ApplyMpStatusFailure;

/**
 * Aplica status do pagamento MP no pedido (service role — D13 / D46 / D83).
 *
 * Idempotente: `paid → paid` retorna `already_paid` sem segundo
 * `order_events`, mas ainda garante `products.status = sold` (retry após
 * falha parcial no webhook).
 *
 * Pedido `cancelled` + MP approved → `reconcileLatePayment` (nunca sold).
 */
export async function applyMercadoPagoPaymentStatus(
  payment: MercadoPagoPayment,
): Promise<ApplyMpStatusResult> {
  const mapped = mapMercadoPagoPaymentStatus(payment.status);
  const supabase = createServiceSupabaseClient();

  const order = await resolveOrder(supabase, payment);
  if (!order) {
    return {
      ok: false,
      error: "Pedido não encontrado para este pagamento.",
      code: "not_found",
    };
  }

  // Já confirmado (ou além) + MP ainda approved → no-op de eventos, mas
  // repara inventário se o apply anterior falhou após marcar o pedido paid.
  if (mapped === "paid" && isOrderPastPendingPayment(order.status)) {
    const nowIso = new Date().toISOString();
    if (order.payment_status !== "paid" || !order.mp_payment_id) {
      await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          mp_payment_id: payment.id,
          paid_at: order.paid_at ?? payment.dateApproved ?? nowIso,
          updated_at: nowIso,
        })
        .eq("id", order.id);
      await upsertPaymentRow(supabase, order.id, payment, "paid", nowIso);
    }

    const sold = await ensureOrderProductsSold(supabase, order.id);
    if (!sold.ok) {
      return sold;
    }

    return {
      ok: true,
      outcome: "already_paid",
      orderId: order.id,
      publicCode: order.public_code,
      paymentStatus: "paid",
      orderStatus: order.status,
    };
  }

  // Late webhook after Override / admin cancel — reconcile, never mark sold (D62/D83).
  if (mapped === "paid" && order.status === "cancelled") {
    const reconciled = await reconcileLatePayment(order, payment, { supabase });
    if (!reconciled.ok) {
      return {
        ok: false,
        error: reconciled.error,
        code: "db",
      };
    }

    return {
      ok: true,
      outcome:
        reconciled.outcome === "noop" ? "noop" : "reconciled_after_override",
      orderId: reconciled.orderId,
      publicCode: reconciled.publicCode,
      paymentStatus: "cancelled",
      orderStatus: "cancelled",
    };
  }

  // Pedido terminal (cancelled non-approved / expired): só espelha payment fields.
  if (order.status === "cancelled" || order.status === "expired") {
    const nowIso = new Date().toISOString();
    await supabase
      .from("orders")
      .update({
        payment_status: mapped,
        mp_payment_id: payment.id,
        updated_at: nowIso,
      })
      .eq("id", order.id);
    await upsertPaymentRow(supabase, order.id, payment, mapped, nowIso);

    return {
      ok: true,
      outcome: "payment_updated",
      orderId: order.id,
      publicCode: order.public_code,
      paymentStatus: mapped,
      orderStatus: order.status,
    };
  }

  if (mapped === "paid" && order.status === "pending_payment") {
    return markOrderPaid(supabase, order, payment);
  }

  // Demais status (pending / failed / cancelled / …) — só payment fields.
  if (
    order.payment_status === mapped &&
    order.mp_payment_id === payment.id
  ) {
    return {
      ok: true,
      outcome: "noop",
      orderId: order.id,
      publicCode: order.public_code,
      paymentStatus: mapped,
      orderStatus: order.status,
    };
  }

  const nowIso = new Date().toISOString();
  const { error: orderError } = await supabase
    .from("orders")
    .update({
      payment_status: mapped,
      mp_payment_id: payment.id,
      updated_at: nowIso,
    })
    .eq("id", order.id);

  if (orderError) {
    console.error("applyMercadoPagoPaymentStatus order update:", orderError);
    return {
      ok: false,
      error: "Não foi possível atualizar o status do pagamento.",
      code: "db",
    };
  }

  await upsertPaymentRow(supabase, order.id, payment, mapped, nowIso);

  return {
    ok: true,
    outcome: "payment_updated",
    orderId: order.id,
    publicCode: order.public_code,
    paymentStatus: mapped,
    orderStatus: order.status,
  };
}

type OrderRow = {
  id: string;
  public_code: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  mp_payment_id: string | null;
  paid_at: string | null;
};

async function resolveOrder(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  payment: MercadoPagoPayment,
): Promise<OrderRow | null> {
  const metadataOrderId = readMetadataString(payment.metadata, "order_id");
  if (metadataOrderId) {
    const { data } = await supabase
      .from("orders")
      .select("id, public_code, status, payment_status, mp_payment_id, paid_at")
      .eq("id", metadataOrderId)
      .maybeSingle();
    if (data) return data;
  }

  const publicCode = (payment.externalReference ?? "").trim().toUpperCase();
  if (publicCode) {
    const { data } = await supabase
      .from("orders")
      .select("id, public_code, status, payment_status, mp_payment_id, paid_at")
      .eq("public_code", publicCode)
      .maybeSingle();
    if (data) return data;
  }

  // Fallback: pedido que já tem este mp_payment_id.
  const { data: byPaymentId } = await supabase
    .from("orders")
    .select("id, public_code, status, payment_status, mp_payment_id, paid_at")
    .eq("mp_payment_id", payment.id)
    .maybeSingle();

  return byPaymentId;
}

async function markOrderPaid(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  order: OrderRow,
  payment: MercadoPagoPayment,
): Promise<ApplyMpStatusResult> {
  const nowIso = new Date().toISOString();
  const paidAt = payment.dateApproved ?? nowIso;

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("product_id")
    .eq("order_id", order.id);

  if (itemsError) {
    console.error("markOrderPaid items:", itemsError);
    return {
      ok: false,
      error: "Não foi possível carregar os itens do pedido.",
      code: "db",
    };
  }

  const productIds = [
    ...new Set(
      (items ?? [])
        .map((row) => row.product_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];

  // Filtro `pending_payment` + `.select()`: 0 linhas = outro webhook já ganhou.
  const { data: updated, error: orderError } = await supabase
    .from("orders")
    .update({
      status: "paid",
      payment_status: "paid",
      mp_payment_id: payment.id,
      paid_at: paidAt,
      updated_at: nowIso,
    })
    .eq("id", order.id)
    .eq("status", "pending_payment")
    .select("id, public_code, status, payment_status, mp_payment_id, paid_at")
    .maybeSingle();

  if (orderError) {
    console.error("markOrderPaid order:", orderError);
    return {
      ok: false,
      error: "Não foi possível confirmar o pagamento do pedido.",
      code: "db",
    };
  }

  if (!updated) {
    const { data: refreshed } = await supabase
      .from("orders")
      .select("id, public_code, status, payment_status, mp_payment_id, paid_at")
      .eq("id", order.id)
      .maybeSingle();

    if (refreshed && isOrderPastPendingPayment(refreshed.status)) {
      return {
        ok: true,
        outcome: "already_paid",
        orderId: refreshed.id,
        publicCode: refreshed.public_code,
        paymentStatus: "paid",
        orderStatus: refreshed.status,
      };
    }

    return {
      ok: false,
      error: "Pedido não está mais aguardando pagamento.",
      code: "invalid",
    };
  }

  const refreshed = updated;

  const sold = await markProductsSoldAndClearReservations(
    order.id,
    productIds,
  );
  if (!sold.ok) {
    return sold;
  }

  await upsertPaymentRow(supabase, order.id, payment, "paid", nowIso, paidAt);

  const { error: eventError } = await supabase.from("order_events").insert({
    order_id: order.id,
    event_type: "payment_confirmed",
    old_value: order.status,
    new_value: "paid",
    actor_type: "system",
    notes: `Mercado Pago payment_id=${payment.id} status=${payment.status}`,
  });

  if (eventError) {
    console.error("markOrderPaid order_events:", eventError);
    // Pagamento já aplicado — não falha a resposta do webhook.
  }

  return {
    ok: true,
    outcome: "applied_paid",
    orderId: refreshed.id,
    publicCode: refreshed.public_code,
    paymentStatus: "paid",
    orderStatus: "paid",
  };
}

async function ensureOrderProductsSold(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  orderId: string,
): Promise<ApplyMpStatusResult | { ok: true }> {
  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("product_id")
    .eq("order_id", orderId);

  if (itemsError) {
    console.error("ensureOrderProductsSold items:", itemsError);
    return {
      ok: false,
      error: "Não foi possível carregar os itens do pedido.",
      code: "db",
    };
  }

  const productIds = [
    ...new Set(
      (items ?? [])
        .map((row) => row.product_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];

  return markProductsSoldAndClearReservations(orderId, productIds);
}

/**
 * SN-05 — paid → sold via inventory state machine (hold→sold or available→sold).
 * Channel online for Mercado Pago checkout (D65 / D71 / D80).
 * SN-04: ensure convert_hold_session once before sold if still active.
 */
async function markProductsSoldAndClearReservations(
  orderId: string,
  productIds: string[],
): Promise<ApplyMpStatusResult | { ok: true }> {
  if (productIds.length === 0) {
    return { ok: true };
  }

  const supabase = createServiceSupabaseClient();
  await ensureHoldConvertedForOrder(supabase, orderId);

  const result = await markProductsSoldForOrder({
    orderId,
    productIds,
    channel: "online",
  });

  if (!result.ok) {
    console.error("markProductsSoldAndClearReservations:", result.reason);
    return {
      ok: false,
      error: "Pagamento confirmado, mas falhou ao marcar peças como vendidas.",
      code: "db",
    };
  }

  return { ok: true };
}

/**
 * SN-04 prep: if createOrderAction somehow skipped convert, convert once.
 * Never converts again when status is already `converted`.
 */
async function ensureHoldConvertedForOrder(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  orderId: string,
): Promise<void> {
  const { data: byOrder, error: byOrderError } = await supabase
    .from("hold_sessions")
    .select("session_id, status")
    .eq("checkout_order_id", orderId)
    .maybeSingle();

  if (byOrderError) {
    console.error("ensureHoldConvertedForOrder lookup:", byOrderError);
  }

  if (byOrder?.status === "converted") {
    return;
  }

  if (byOrder?.status === "active" && byOrder.session_id) {
    try {
      await convertHoldSession(byOrder.session_id, orderId);
    } catch (convertError) {
      console.error("ensureHoldConvertedForOrder convert:", convertError);
    }
    return;
  }

  // Fallback: hold_session_id stored on pricing_snapshot at order create (SN-04).
  const { data: orderRow } = await supabase
    .from("orders")
    .select("pricing_snapshot_json")
    .eq("id", orderId)
    .maybeSingle();

  const snapshot = orderRow?.pricing_snapshot_json;
  const holdSessionId =
    snapshot &&
    typeof snapshot === "object" &&
    !Array.isArray(snapshot) &&
    typeof (snapshot as { hold_session_id?: unknown }).hold_session_id === "string"
      ? (snapshot as { hold_session_id: string }).hold_session_id
      : null;

  if (!holdSessionId) return;

  const { data: byId } = await supabase
    .from("hold_sessions")
    .select("session_id, status")
    .eq("id", holdSessionId)
    .maybeSingle();

  if (!byId || byId.status === "converted") return;

  if (byId.status === "active") {
    try {
      await convertHoldSession(byId.session_id, orderId);
    } catch (convertError) {
      console.error("ensureHoldConvertedForOrder convert by id:", convertError);
    }
  }
}

async function upsertPaymentRow(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  orderId: string,
  payment: MercadoPagoPayment,
  status: PaymentStatus,
  nowIso: string,
  paidAt?: string | null,
): Promise<void> {
  const { data: existing } = await supabase
    .from("payments")
    .select("id")
    .eq("order_id", orderId)
    .eq("provider", "mercado_pago")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const payload = {
    provider_payment_id: payment.id,
    provider_preference_id: payment.preferenceId,
    status,
    amount: payment.transactionAmount ?? undefined,
    paid_at: status === "paid" ? (paidAt ?? payment.dateApproved ?? nowIso) : null,
    raw_payload_json: payment.raw as Json,
    updated_at: nowIso,
  };

  if (existing) {
    const { error } = await supabase
      .from("payments")
      .update(payload)
      .eq("id", existing.id);
    if (error) console.error("upsertPaymentRow update:", error);
    return;
  }

  const { error } = await supabase.from("payments").insert({
    order_id: orderId,
    provider: "mercado_pago",
    ...payload,
    amount: payment.transactionAmount ?? 0,
  });
  if (error) console.error("upsertPaymentRow insert:", error);
}

function readMetadataString(
  metadata: Record<string, unknown> | null,
  key: string,
): string | null {
  if (!metadata) return null;
  const value = metadata[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}
