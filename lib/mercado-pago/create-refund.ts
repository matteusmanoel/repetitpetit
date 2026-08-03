import "server-only";

import {
  getMercadoPagoConfig,
  MERCADOPAGO_API_BASE,
} from "@/lib/mercado-pago/config";

export type CreateRefundResult = {
  ok: true;
  stubbed: false;
  refundId: string;
  raw: unknown;
};

export type CreateRefundFailure = {
  ok: false;
  stubbed: false;
  error: string;
};

/**
 * POST /v1/payments/{id}/refunds — full refund of a captured payment.
 * @see https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-api/refunds/create-refund/post
 *
 * SN-06 (#72) injects a stub by default in `reconcileLatePayment` so Cloud/unit
 * runs never hit live Mercado Pago. Wire this client when ops enable live refunds.
 */
export async function createMercadoPagoRefund(
  paymentId: string,
): Promise<CreateRefundResult | CreateRefundFailure> {
  const id = paymentId.trim();
  if (!id) {
    return { ok: false, stubbed: false, error: "payment_id inválido para reembolso." };
  }

  try {
    const { accessToken } = getMercadoPagoConfig();
    const response = await fetch(
      `${MERCADOPAGO_API_BASE}/v1/payments/${encodeURIComponent(id)}/refunds`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": `refund-${id}`,
        },
        body: JSON.stringify({}),
        cache: "no-store",
      },
    );

    const raw: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const message = extractMpError(raw) ?? `HTTP ${response.status}`;
      console.error(
        `[mercado-pago] createMercadoPagoRefund failed payment_id=${id}: ${message}`,
      );
      return { ok: false, stubbed: false, error: message };
    }

    const refundId = readRefundId(raw);
    if (!refundId) {
      console.error(
        `[mercado-pago] createMercadoPagoRefund missing refund id payment_id=${id}`,
      );
      return {
        ok: false,
        stubbed: false,
        error: "Resposta de reembolso sem id.",
      };
    }

    return { ok: true, stubbed: false, refundId, raw };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "erro desconhecido no reembolso";
    console.error(
      `[mercado-pago] createMercadoPagoRefund exception payment_id=${id}:`,
      message,
    );
    return { ok: false, stubbed: false, error: message };
  }
}

/**
 * Stub used by SN-06 reconcile path (D81). Logs intent; no network call.
 * Never fails silently — always emits a clear warn.
 */
export async function stubMercadoPagoRefund(
  paymentId: string,
): Promise<{ ok: true; stubbed: true; refundId: null }> {
  const id = paymentId.trim() || "(missing)";
  console.warn(
    `[SN-06] stub Mercado Pago Refunds API — would POST /v1/payments/${id}/refunds ` +
      `(late webhook after cancel/override; no live call in this path)`,
  );
  return { ok: true, stubbed: true, refundId: null };
}

export type RefundMercadoPagoPaymentFn = (
  paymentId: string,
) => Promise<
  | { ok: true; stubbed: boolean; refundId: string | null; raw?: unknown }
  | { ok: false; stubbed: boolean; error: string }
>;

function readRefundId(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const id = (raw as Record<string, unknown>).id;
  if (typeof id === "number" || typeof id === "string") return String(id);
  return null;
}

function extractMpError(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.message === "string") return obj.message;
  if (typeof obj.error === "string") return obj.error;
  return null;
}
