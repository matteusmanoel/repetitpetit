import "server-only";

import {
  getMercadoPagoConfig,
  MERCADOPAGO_API_BASE,
} from "@/lib/mercado-pago/config";

export type MercadoPagoPayment = {
  id: string;
  status: string;
  statusDetail: string | null;
  externalReference: string | null;
  transactionAmount: number | null;
  dateApproved: string | null;
  preferenceId: string | null;
  metadata: Record<string, unknown> | null;
  raw: unknown;
};

/**
 * Busca pagamento por id na Payments API.
 * @see https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-api/get-payment/get
 */
export async function fetchMercadoPagoPayment(
  paymentId: string,
): Promise<MercadoPagoPayment> {
  const id = paymentId.trim();
  if (!id) {
    throw new Error("payment_id inválido para consulta no Mercado Pago.");
  }

  const { accessToken } = getMercadoPagoConfig();
  const response = await fetch(`${MERCADOPAGO_API_BASE}/v1/payments/${id}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const raw: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message = extractMpError(raw) ?? `HTTP ${response.status}`;
    throw new Error(`Falha ao buscar pagamento Mercado Pago: ${message}`);
  }

  return normalizePayment(raw, id);
}

/**
 * Lista pagamentos pelo `external_reference` (nosso `public_code`).
 * Usado pelo sync quando `orders.mp_payment_id` ainda não foi gravado.
 */
export async function searchMercadoPagoPaymentsByExternalReference(
  externalReference: string,
): Promise<MercadoPagoPayment[]> {
  const ref = externalReference.trim();
  if (!ref) return [];

  const { accessToken } = getMercadoPagoConfig();
  const url = new URL(`${MERCADOPAGO_API_BASE}/v1/payments/search`);
  url.searchParams.set("external_reference", ref);
  url.searchParams.set("sort", "date_created");
  url.searchParams.set("criteria", "desc");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const raw: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message = extractMpError(raw) ?? `HTTP ${response.status}`;
    throw new Error(`Falha ao buscar pagamentos por referência: ${message}`);
  }

  const results = readArray(raw, "results");
  return results
    .map((item, index) => {
      try {
        return normalizePayment(item, `search-${index}`);
      } catch {
        return null;
      }
    })
    .filter((p): p is MercadoPagoPayment => p !== null);
}

function normalizePayment(raw: unknown, fallbackId: string): MercadoPagoPayment {
  if (!raw || typeof raw !== "object") {
    throw new Error("Resposta de pagamento Mercado Pago inválida.");
  }

  const obj = raw as Record<string, unknown>;
  const idValue = obj.id;
  const id =
    typeof idValue === "number" || typeof idValue === "string"
      ? String(idValue)
      : fallbackId;

  const status = typeof obj.status === "string" ? obj.status : "";
  if (!status) {
    throw new Error(`Pagamento ${id} sem status na resposta do Mercado Pago.`);
  }

  return {
    id,
    status,
    statusDetail:
      typeof obj.status_detail === "string" ? obj.status_detail : null,
    externalReference:
      typeof obj.external_reference === "string"
        ? obj.external_reference
        : null,
    transactionAmount:
      typeof obj.transaction_amount === "number"
        ? obj.transaction_amount
        : null,
    dateApproved:
      typeof obj.date_approved === "string" ? obj.date_approved : null,
    preferenceId:
      typeof obj.preference_id === "string" ? obj.preference_id : null,
    metadata:
      obj.metadata && typeof obj.metadata === "object"
        ? (obj.metadata as Record<string, unknown>)
        : null,
    raw,
  };
}

function readArray(raw: unknown, key: string): unknown[] {
  if (!raw || typeof raw !== "object") return [];
  const value = (raw as Record<string, unknown>)[key];
  return Array.isArray(value) ? value : [];
}

function extractMpError(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.message === "string") return obj.message;
  if (typeof obj.error === "string") return obj.error;
  return null;
}
