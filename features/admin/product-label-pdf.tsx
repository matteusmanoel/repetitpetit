import "server-only";

import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  renderToBuffer,
} from "@react-pdf/renderer";

export type ProductLabelPdfInput = {
  storeName: string;
  staffCode: string;
  productName: string;
  sizeLabel: string;
  /** PNG bytes from `generateQRCodePNG`. */
  qrPng: Buffer;
};

const styles = StyleSheet.create({
  page: {
    padding: 10,
    fontFamily: "Helvetica",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  store: {
    fontSize: 8,
    marginBottom: 6,
    textAlign: "center",
    color: "#333333",
  },
  qr: {
    width: 96,
    height: 96,
    marginBottom: 6,
  },
  code: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
    textAlign: "center",
  },
  name: {
    fontSize: 8,
    textAlign: "center",
    marginBottom: 2,
    maxLines: 1,
  },
  size: {
    fontSize: 8,
    textAlign: "center",
    color: "#444444",
  },
});

function truncateOneLine(value: string, max = 42): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function ProductLabelPdfDocument({
  storeName,
  staffCode,
  productName,
  sizeLabel,
  qrPng,
}: ProductLabelPdfInput) {
  const qrSrc = `data:image/png;base64,${qrPng.toString("base64")}`;

  return (
    <Document title={`Etiqueta ${staffCode}`} author={storeName}>
      {/* 58mm × 40mm thermal-ish page (points ≈ mm * 2.834) */}
      <Page size={[164, 113]} style={styles.page}>
        <Text style={styles.store}>{storeName}</Text>
        {/* QR is decorative identity for staff scan; staff_code text is below. */}
        {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf Image has no alt */}
        <Image src={qrSrc} style={styles.qr} />
        <Text style={styles.code}>{staffCode}</Text>
        <Text style={styles.name}>{truncateOneLine(productName)}</Text>
        <Text style={styles.size}>{sizeLabel}</Text>
      </Page>
    </Document>
  );
}

/** Renders the printable PDF buffer (no price — D73). */
export async function renderProductLabelPdf(
  input: ProductLabelPdfInput,
): Promise<Buffer> {
  const buffer = await renderToBuffer(<ProductLabelPdfDocument {...input} />);
  return Buffer.from(buffer);
}
