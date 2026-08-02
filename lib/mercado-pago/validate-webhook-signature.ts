import { createHmac, timingSafeEqual } from "node:crypto";

export type ValidateWebhookSignatureInput = {
  /** Header `x-signature` — formato `ts=…,v1=…`. */
  xSignature: string | null | undefined;
  /** Header `x-request-id`. */
  xRequestId: string | null | undefined;
  /**
   * Query param `data.id` (resource id). MP exige lowercase no manifest
   * quando o id tem alfanuméricos maiúsculos.
   */
  dataId: string | null | undefined;
  /** Secret gerado em Suas integrações → Webhooks. */
  secret: string;
};

/**
 * Valida origem do webhook Mercado Pago via HMAC-SHA256 do manifest.
 *
 * Manifest (docs MP): `id:[data.id];request-id:[x-request-id];ts:[ts];`
 * Pares ausentes são omitidos. Comparação em tempo constante.
 *
 * @see https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 */
export function validateMercadoPagoWebhookSignature(
  input: ValidateWebhookSignatureInput,
): boolean {
  const secret = input.secret.trim();
  if (!secret) return false;

  const parsed = parseXSignature(input.xSignature);
  if (!parsed) return false;

  const dataId = (input.dataId ?? "").trim().toLowerCase();
  const xRequestId = (input.xRequestId ?? "").trim();

  const parts: string[] = [];
  if (dataId) parts.push(`id:${dataId}`);
  if (xRequestId) parts.push(`request-id:${xRequestId}`);
  parts.push(`ts:${parsed.ts}`);

  const manifest = `${parts.join(";")};`;
  const computed = createHmac("sha256", secret).update(manifest).digest("hex");

  return equalHex(computed, parsed.v1);
}

function parseXSignature(
  header: string | null | undefined,
): { ts: string; v1: string } | null {
  if (!header?.trim()) return null;

  let ts: string | undefined;
  let v1: string | undefined;

  for (const part of header.split(",")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const val = part.slice(eq + 1).trim();
    if (key === "ts") ts = val;
    if (key === "v1") v1 = val;
  }

  if (!ts || !v1) return null;
  return { ts, v1 };
}

function equalHex(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "utf8");
    const bufB = Buffer.from(b, "utf8");
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
