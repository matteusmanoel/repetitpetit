import "server-only";

import {
  getMercadoPagoConfig,
  MERCADOPAGO_API_BASE,
} from "@/lib/mercado-pago/config";
import {
  buildPreferenceBody,
  type CreatePreferenceInput,
} from "@/lib/mercado-pago/preference-body";

export type { CreatePreferenceInput, PreferenceItemInput } from "@/lib/mercado-pago/preference-body";
export { buildPreferenceBody } from "@/lib/mercado-pago/preference-body";

export type CreatePreferenceResult = {
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint: string | null;
  raw: unknown;
};

/**
 * Cria preferência Checkout Pro via REST Preference API.
 * @see https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-pro/preferences/create-preference/post
 */
export async function createMercadoPagoPreference(
  input: CreatePreferenceInput,
): Promise<CreatePreferenceResult> {
  const config = getMercadoPagoConfig();
  const body = buildPreferenceBody(input, config.siteUrl, config.storeName);

  const response = await fetch(`${MERCADOPAGO_API_BASE}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `pref-${input.externalReference}-${Date.now()}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const raw: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message = extractMpError(raw) ?? `HTTP ${response.status}`;
    throw new Error(`Falha ao criar preferência Mercado Pago: ${message}`);
  }

  const preferenceId = readString(raw, "id");
  const initPoint = readString(raw, "init_point");
  const sandboxInitPoint = readString(raw, "sandbox_init_point");

  if (!preferenceId || !initPoint) {
    throw new Error(
      "Resposta do Mercado Pago sem id/init_point na preferência.",
    );
  }

  const checkoutUrl =
    config.isSandbox && sandboxInitPoint ? sandboxInitPoint : initPoint;

  return {
    preferenceId,
    initPoint: checkoutUrl,
    sandboxInitPoint,
    raw,
  };
}

function readString(raw: unknown, key: string): string | null {
  if (!raw || typeof raw !== "object") return null;
  const value = (raw as Record<string, unknown>)[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function extractMpError(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.message === "string") return obj.message;
  if (typeof obj.error === "string") return obj.error;
  if (Array.isArray(obj.cause) && obj.cause[0]) {
    const cause = obj.cause[0] as Record<string, unknown>;
    if (typeof cause.description === "string") return cause.description;
    if (typeof cause.message === "string") return cause.message;
  }
  return null;
}
