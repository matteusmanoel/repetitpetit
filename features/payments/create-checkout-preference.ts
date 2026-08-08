import "server-only";

import { createMercadoPagoPreference } from "@/lib/mercado-pago/create-preference";
import type { Json } from "@/lib/supabase/types";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

export type CreateCheckoutPreferenceSuccess = {
  success: true;
  preferenceId: string;
  initPoint: string;
  publicCode: string;
  orderId: string;
};

export type CreateCheckoutPreferenceFailure = {
  success: false;
  error: string;
  code?: "not_found" | "invalid_status" | "mp_config" | "mp_api" | "db";
};

export type CreateCheckoutPreferenceResult =
  | CreateCheckoutPreferenceSuccess
  | CreateCheckoutPreferenceFailure;

export type CreateCheckoutPreferenceOptions = {
  /** `hold_sessions.id` — metadata para reconciliação no webhook (SN-04/SN-06). */
  holdSessionId?: string | null;
};

/**
 * Cria preferência Checkout Pro a partir de `order_items` (D08 / D13).
 * Persiste `orders.mp_preference_id` + linha `payments` via service role.
 */
export async function createCheckoutPreferenceForOrder(
  orderId: string,
  options: CreateCheckoutPreferenceOptions = {},
): Promise<CreateCheckoutPreferenceResult> {
  const supabase = createServiceSupabaseClient();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, public_code, status, payment_status, shipping_amount, total_amount, expires_at, mp_preference_id, customer_id",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) {
    console.error("Falha ao carregar pedido para MP:", orderError);
    return {
      success: false,
      error: "Não foi possível carregar o pedido para pagamento.",
      code: "db",
    };
  }

  if (!order) {
    return {
      success: false,
      error: "Pedido não encontrado.",
      code: "not_found",
    };
  }

  if (order.status !== "pending_payment" || order.payment_status !== "pending") {
    return {
      success: false,
      error: "Este pedido não está aguardando pagamento.",
      code: "invalid_status",
    };
  }

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select(
      "id, product_id, product_name_snapshot, unit_price_snapshot, cover_image_snapshot, quantity, line_total",
    )
    .eq("order_id", orderId);

  if (itemsError || !items || items.length === 0) {
    console.error("Falha ao carregar order_items para MP:", itemsError);
    return {
      success: false,
      error: "Pedido sem peças para cobrança.",
      code: "db",
    };
  }

  let payer:
    | { name?: string | null; email?: string | null; phone?: string | null }
    | undefined;

  if (order.customer_id) {
    const { data: customer } = await supabase
      .from("customers")
      .select("full_name, email, phone")
      .eq("id", order.customer_id)
      .maybeSingle();

    if (customer) {
      payer = {
        name: customer.full_name,
        email: customer.email,
        phone: customer.phone,
      };
    }
  }

  try {
    const preference = await createMercadoPagoPreference({
      externalReference: order.public_code,
      items: items.map((item) => ({
        id: item.product_id ?? item.id,
        title: item.product_name_snapshot,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price_snapshot),
        pictureUrl: item.cover_image_snapshot,
      })),
      shippingAmount: Number(order.shipping_amount),
      payer,
      // D109 / SO-03: pós-MP sempre `/pedido/[codigo]` primeiro (nudge soft lá).
      backPath: `/pedido/${encodeURIComponent(order.public_code)}`,
      metadata: {
        order_id: order.id,
        public_code: order.public_code,
        ...(options.holdSessionId
          ? { hold_session_id: options.holdSessionId }
          : {}),
      },
    });

    const nowIso = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        mp_preference_id: preference.preferenceId,
        updated_at: nowIso,
      })
      .eq("id", order.id);

    if (updateError) {
      console.error("Falha ao salvar mp_preference_id:", updateError);
      return {
        success: false,
        error: "Preferência criada, mas falhou ao salvar no pedido.",
        code: "db",
      };
    }

    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("order_id", order.id)
      .eq("provider", "mercado_pago")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const paymentPayload = {
      provider_preference_id: preference.preferenceId,
      amount: Number(order.total_amount),
      expires_at: order.expires_at,
      raw_payload_json: preference.raw as Json,
      updated_at: nowIso,
    };

    if (existingPayment) {
      const { error: paymentUpdateError } = await supabase
        .from("payments")
        .update(paymentPayload)
        .eq("id", existingPayment.id);

      if (paymentUpdateError) {
        console.error("Falha ao atualizar payments:", paymentUpdateError);
      }
    } else {
      const { error: paymentInsertError } = await supabase
        .from("payments")
        .insert({
          order_id: order.id,
          provider: "mercado_pago",
          status: "pending",
          ...paymentPayload,
        });

      if (paymentInsertError) {
        console.error("Falha ao inserir payments:", paymentInsertError);
      }
    }

    return {
      success: true,
      preferenceId: preference.preferenceId,
      initPoint: preference.initPoint,
      publicCode: order.public_code,
      orderId: order.id,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido no Mercado Pago.";
    console.error("createCheckoutPreferenceForOrder:", message);

    if (message.includes("MERCADOPAGO_ACCESS_TOKEN") || message.includes("HTTPS")) {
      return { success: false, error: message, code: "mp_config" };
    }

    return {
      success: false,
      error:
        "Não foi possível iniciar o pagamento no Mercado Pago. Tente novamente em instantes.",
      code: "mp_api",
    };
  }
}

/**
 * Reinicia Checkout Pro a partir do código público (pedido pending_payment).
 */
export async function createCheckoutPreferenceByPublicCode(
  publicCode: string,
): Promise<CreateCheckoutPreferenceResult> {
  const code = publicCode.trim().toUpperCase();
  if (!/^RP-\d{4}-\d{4}$/.test(code)) {
    return {
      success: false,
      error: "Código de pedido inválido.",
      code: "not_found",
    };
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id")
    .eq("public_code", code)
    .maybeSingle();

  if (error) {
    console.error("Falha ao buscar pedido por código:", error);
    return {
      success: false,
      error: "Não foi possível localizar o pedido.",
      code: "db",
    };
  }

  if (!data) {
    return {
      success: false,
      error: "Pedido não encontrado.",
      code: "not_found",
    };
  }

  return createCheckoutPreferenceForOrder(data.id);
}
