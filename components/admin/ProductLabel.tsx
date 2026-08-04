/**
 * HTML thermal label for a Peça (SN-10 / D73).
 * No price on the label. QR encodes Passport URL (SN-11 may 404 until shipped).
 *
 * Print via `@media print` rules targeting `.label-print` in `app/globals.css`.
 */

export type ProductLabelProps = {
  storeName: string;
  staffCode: string;
  productName: string;
  sizeLabel: string;
  /** Inline SVG markup from `generateQRCodeSVG`. */
  qrSvg: string;
};

function truncateOneLine(value: string, max = 42): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function ProductLabel({
  storeName,
  staffCode,
  productName,
  sizeLabel,
  qrSvg,
}: ProductLabelProps) {
  return (
    <div className="label-print">
      <p className="label-print__store">{storeName}</p>
      <div
        className="label-print__qr"
        // QR SVG is generated server-side from our own helpers — not user HTML.
        dangerouslySetInnerHTML={{ __html: qrSvg }}
      />
      <p className="label-print__code">{staffCode}</p>
      <p className="label-print__name">{truncateOneLine(productName)}</p>
      <p className="label-print__size">{sizeLabel}</p>
    </div>
  );
}
