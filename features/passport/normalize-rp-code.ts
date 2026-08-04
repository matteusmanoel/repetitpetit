/**
 * Normalize a Passport deep-link path param to a staff_code lookup key (D64 / D81).
 * Decodes URI, trims, uppercases the RP- prefix form.
 */
export function normalizePassportRpCode(raw: string): string {
  let decoded = raw.trim();
  try {
    decoded = decodeURIComponent(decoded).trim();
  } catch {
    // Keep raw trim if the segment is not valid URI encoding.
  }
  return decoded.toUpperCase();
}
