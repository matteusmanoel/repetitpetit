import "server-only";

import QRCode from "qrcode";

/**
 * SN-10 — server-only QR generation (do not import from Client Components).
 * Prefer SVG for HTML labels; PNG Buffer for PDF embedding.
 */

export async function generateQRCodeSVG(content: string): Promise<string> {
  return QRCode.toString(content, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 256,
  });
}

export async function generateQRCodePNG(content: string): Promise<Buffer> {
  return QRCode.toBuffer(content, {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 256,
  });
}
