import "server-only";

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
  outcome: "applied_paid" | "already_paid" | "payment_updated" | "noop";
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
 * Aplica status do pagamento MP no pedido (service role — D13 / D46).
 *
 * Idempotente: `paid → paid` retorna `already_paid` sem erro e sem
 * reescrever produtos / order_events.
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

  // Já confirmado (ou além) + MP ainda approved → no-op idempotente.
  if (mapped === "paid" && isOrderPastPendingPayment(order.status)) {
    if (order.payment_status !== "paid" || !order.mp_payment_id) {
      const nowIso = new Date().toISOString();
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

    return {
      ok: true,
      outcome: "already_paid",
      orderId: order.id,
      publicCode: order.public_code,
      paymentStatus: "paid",
      orderStatus: order.status,
    };
  }

  // Pedido terminal (cancelled/expired): só espelha payment_status / mp ids.
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

  if (productIds.length > 0) {
    const { error: productsError } = await supabase
      .from("products")
      .update({ status: "sold", updated_at: nowIso })
      .in("id", productIds);

    if (productsError) {
      console.error("markOrderPaid products sold:", productsError);
      return {
        ok: false,
        error: "Pagamento confirmado, mas falhou ao marcar peças como vendidas.",
        code: "db",
      };
    }

    const { error: reservationsError } = await supabase
      .from("cart_reservations")
      .delete()
      .in("product_id", productIds);

    if (reservationsError) {
      console.error("markOrderPaid reservations:", reservationsError);
      // Não falha o fluxo — produto já sold; reserva órfã será varrida pelo cron.
    }
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
