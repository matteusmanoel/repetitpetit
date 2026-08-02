import "server-only";

import {
  applyMercadoPagoPaymentStatus,
  type ApplyMpStatusResult,
} from "@/features/payments/apply-mp-status";
import {
  fetchMercadoPagoPayment,
  searchMercadoPagoPaymentsByExternalReference,
  type MercadoPagoPayment,
} from "@/lib/mercado-pago/fetch-payment";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

export type SyncOrderPaymentInput = {
  publicCode?: string;
  orderId?: string;
};

export type SyncOrderPaymentResult =
  | (Extract<ApplyMpStatusResult, { ok: true }> & {
      syncedFrom: "mp_payment_id" | "search";
    })
  | {
      ok: false;
      error: string;
      code:
        | "not_found"
        | "no_payment"
        | "mp_config"
        | "mp_api"
        | "invalid"
        | "db";
    };

/**
 * Reconcilia um pedido contra o estado atual do pagamento no Mercado Pago.
 * Cobre webhooks perdidos (D46).
 */
export async function syncOrderPayment(
  input: SyncOrderPaymentInput,
): Promise<SyncOrderPaymentResult> {
  const supabase = createServiceSupabaseClient();

  let orderQuery = supabase
    .from("orders")
    .select("id, public_code, mp_payment_id, status, payment_status");

  if (input.orderId?.trim()) {
    orderQuery = orderQuery.eq("id", input.orderId.trim());
  } else if (input.publicCode?.trim()) {
    const code = input.publicCode.trim().toUpperCase();
    if (!/^RP-\d{4}-\d{4}$/.test(code)) {
      return {
        ok: false,
        error: "Código de pedido inválido.",
        code: "invalid",
      };
    }
    orderQuery = orderQuery.eq("public_code", code);
  } else {
    return {
      ok: false,
      error: "Informe o código ou o id do pedido.",
      code: "invalid",
    };
  }

  const { data: order, error } = await orderQuery.maybeSingle();

  if (error) {
    console.error("syncOrderPayment lookup:", error);
    return {
      ok: false,
      error: "Não foi possível localizar o pedido.",
      code: "not_found",
    };
  }

  if (!order) {
    return {
      ok: false,
      error: "Pedido não encontrado.",
      code: "not_found",
    };
  }

  try {
    let payment: MercadoPagoPayment | null = null;
    let syncedFrom: "mp_payment_id" | "search" = "search";

    if (order.mp_payment_id) {
      payment = await fetchMercadoPagoPayment(order.mp_payment_id);
      syncedFrom = "mp_payment_id";
    } else {
      const found = await searchMercadoPagoPaymentsByExternalReference(
        order.public_code,
      );
      payment = pickBestPayment(found);
      syncedFrom = "search";
    }

    if (!payment) {
      return {
        ok: false,
        error: "Nenhum pagamento encontrado no Mercado Pago para este pedido.",
        code: "no_payment",
      };
    }

    const applied = await applyMercadoPagoPaymentStatus(payment);
    if (!applied.ok) {
      return {
        ok: false,
        error: applied.error,
        code: applied.code,
      };
    }

    return { ...applied, syncedFrom };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido.";
    console.error("syncOrderPayment:", message);

    if (
      message.includes("MERCADOPAGO_ACCESS_TOKEN") ||
      message.includes("HTTPS")
    ) {
      return {
        ok: false,
        error: "Mercado Pago não configurado neste ambiente.",
        code: "mp_config",
      };
    }

    return {
      ok: false,
      error: "Não foi possível consultar o pagamento no Mercado Pago.",
      code: "mp_api",
    };
  }
}

/** Prefere approved; senão o mais recente da lista (já sorted desc). */
function pickBestPayment(
  payments: MercadoPagoPayment[],
): MercadoPagoPayment | null {
  if (payments.length === 0) return null;
  const approved = payments.find((p) => p.status === "approved");
  return approved ?? payments[0] ?? null;
}
