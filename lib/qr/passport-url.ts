/**
 * Pure helpers for Garment Passport QR content (SN-10 / D73 / D64).
 * No I/O — safe for unit tests and client/server.
 */

/** Deep link opened when staff scans the piece QR (Passport route = SN-11). */
export function buildPassportUrl(siteUrl: string, staffCode: string): string {
  const base = siteUrl.replace(/\/$/, "");
  const code = staffCode.trim();
  return `${base}/admin/passport/${encodeURIComponent(code)}`;
}

/** Admin PDF label download path for a product id. */
export function productLabelPdfPath(productId: string): string {
  return `/admin/produto/${productId}/label.pdf`;
}

/** Admin thermal/HTML label print path for a product id. */
export function productLabelPrintPath(productId: string): string {
  return `/admin/produto/${productId}/etiqueta`;
}

/** POS sell entry (SN-08 / D86). */
export function posSellPath(productId: string): string {
  return `/admin/pos?product=${encodeURIComponent(productId)}`;
}

/** Override entry for a held Peça (SN-13 / D85). */
export function overridePath(productId: string): string {
  return `/admin/override?product=${encodeURIComponent(productId)}`;
}

/** Admin product edit path (existing form). */
export function productEditPath(productId: string): string {
  return `/admin/produtos/${productId}`;
}
