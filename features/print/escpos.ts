/**
 * Abstract ESC/POS label builder (SO-04 / D107).
 * Printer model TBD — this emits a minimal, model-agnostic byte stream.
 * Vercel never talks USB; a local bridge consumes these bytes.
 */

export type EscPosLabelPayload = {
  storeName: string;
  staffCode: string;
  productName: string;
  sizeLabel: string;
  /** Passport deep-link (QR payload). */
  passportUrl: string;
};

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

function encodeText(text: string): Uint8Array {
  // ESC/POS code page 437-ish fallback: strip non-ASCII for thermal ASCII printers.
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "?");
  const bytes = new Uint8Array(normalized.length);
  for (let i = 0; i < normalized.length; i += 1) {
    bytes[i] = normalized.charCodeAt(i);
  }
  return bytes;
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function line(text: string): Uint8Array {
  return concatBytes([encodeText(text), new Uint8Array([LF])]);
}

/**
 * Build ESC/POS bytes for a 58mm garment label (no price — D73).
 * Includes init, centered text, QR (model 2), and partial cut.
 */
export function buildEscPosLabel(payload: EscPosLabelPayload): Uint8Array {
  const store = payload.storeName.trim().slice(0, 32) || "Repeti Petit";
  const code = payload.staffCode.trim().slice(0, 16);
  const name = payload.productName.trim().slice(0, 42);
  const size = payload.sizeLabel.trim().slice(0, 24);
  const qrContent = payload.passportUrl.trim().slice(0, 256);

  const init = new Uint8Array([ESC, 0x40]); // ESC @
  const alignCenter = new Uint8Array([ESC, 0x61, 0x01]); // ESC a 1
  const boldOn = new Uint8Array([ESC, 0x45, 0x01]);
  const boldOff = new Uint8Array([ESC, 0x45, 0x00]);
  const doubleHeight = new Uint8Array([GS, 0x21, 0x11]);
  const normalSize = new Uint8Array([GS, 0x21, 0x00]);

  // GS ( k — QR Code store + print (model 2). Size module 4, error L.
  const qrData = encodeText(qrContent);
  const storeLen = qrData.length + 3;
  const pL = storeLen & 0xff;
  const pH = (storeLen >> 8) & 0xff;
  const qrStore = concatBytes([
    new Uint8Array([GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30]),
    qrData,
  ]);
  const qrSize = new Uint8Array([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, 0x04]);
  const qrError = new Uint8Array([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x30]);
  const qrPrint = new Uint8Array([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]);

  const cut = new Uint8Array([GS, 0x56, 0x00]); // full cut

  return concatBytes([
    init,
    alignCenter,
    boldOn,
    line(store),
    boldOff,
    qrSize,
    qrError,
    qrStore,
    qrPrint,
    new Uint8Array([LF]),
    doubleHeight,
    boldOn,
    line(code),
    boldOff,
    normalSize,
    line(name),
    line(`Tam: ${size}`),
    new Uint8Array([LF, LF]),
    cut,
  ]);
}
