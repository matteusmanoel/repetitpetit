import { normalizePassportRpCode } from "@/features/passport/normalize-rp-code";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PosLookupQuery =
  | { kind: "empty" }
  | { kind: "id"; id: string }
  | { kind: "staff_code"; staffCode: string };

/**
 * Normaliza entrada do POS: UUID, RP-…, URL do Passaporte ou `?product=`.
 * Scan de QR (câmera) tipicamente abre o Passaporte; colar a URL aqui também resolve.
 */
export function resolvePosLookupQuery(raw: string): PosLookupQuery {
  let query = raw.trim();
  if (!query) return { kind: "empty" };

  try {
    query = decodeURIComponent(query).trim();
  } catch {
    // keep trimmed raw
  }

  const productParam = query.match(/[?&]product=([^&#]+)/i);
  if (productParam?.[1]) {
    const id = productParam[1].trim();
    if (UUID_RE.test(id)) {
      return { kind: "id", id };
    }
  }

  const passportMatch = query.match(/\/admin\/passport\/([^/?#]+)/i);
  if (passportMatch?.[1]) {
    const staffCode = normalizePassportRpCode(passportMatch[1]);
    if (!staffCode) return { kind: "empty" };
    return { kind: "staff_code", staffCode };
  }

  if (UUID_RE.test(query)) {
    return { kind: "id", id: query };
  }

  const staffCode = normalizePassportRpCode(query);
  if (!staffCode) return { kind: "empty" };
  return { kind: "staff_code", staffCode };
}

/** Minutos restantes do hold (ceil), 0 se expirado/inválido. */
export function remainingHoldMinutes(
  expiresAt: string,
  nowMs: number = Date.now(),
): number {
  const expiresMs = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresMs)) return 0;
  return Math.max(0, Math.ceil((expiresMs - nowMs) / 60_000));
}
