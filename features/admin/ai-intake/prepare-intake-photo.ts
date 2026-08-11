/**
 * Normaliza foto do intake (iPhone/Safari) para JPEG ≤ limite do `/api/upload`.
 * Evita HEIC, arquivos >8MB e o `new File([blob])` que quebra FormData no WebKit.
 */

const MAX_EDGE_PX = 1920;
const JPEG_QUALITY = 0.82;
const MAX_BYTES = 7.5 * 1024 * 1024;

const DIRECT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

function isDirectUploadCandidate(file: Blob): boolean {
  return (
    DIRECT_TYPES.has(file.type) &&
    file.size > 0 &&
    file.size <= MAX_BYTES
  );
}

async function blobToImageSource(blob: Blob): Promise<CanvasImageSource> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(blob);
    } catch {
      // HEIC / codecs sem bitmap — cai no <img>
    }
  }

  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () =>
        reject(new Error("Não foi possível ler a imagem neste dispositivo."));
      el.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasToJpegFile(
  canvas: HTMLCanvasElement,
  name: string,
): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Falha ao converter a foto para JPEG."));
          return;
        }
        resolve(
          new File([blob], name, {
            type: "image/jpeg",
            lastModified: Date.now(),
          }),
        );
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

/**
 * Devolve um `File` JPEG pronto para `FormData.append("file", file)`.
 */
export async function prepareIntakePhotoForUpload(
  input: Blob | File,
): Promise<File> {
  const baseName =
    input instanceof File && input.name.trim()
      ? input.name.replace(/\.[^.]+$/, "")
      : `capture-${Date.now()}`;
  const jpegName = `${baseName}.jpg`;

  if (isDirectUploadCandidate(input) && input instanceof File) {
    return input;
  }

  if (isDirectUploadCandidate(input) && !(input instanceof File)) {
    return new File([input], jpegName, {
      type: input.type || "image/jpeg",
      lastModified: Date.now(),
    });
  }

  const source = await blobToImageSource(input);
  const width =
    "naturalWidth" in source && source.naturalWidth
      ? source.naturalWidth
      : (source as ImageBitmap).width;
  const height =
    "naturalHeight" in source && source.naturalHeight
      ? source.naturalHeight
      : (source as ImageBitmap).height;

  if (!width || !height) {
    throw new Error("Imagem inválida ou corrompida.");
  }

  const scale = Math.min(1, MAX_EDGE_PX / Math.max(width, height));
  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas indisponível para processar a foto.");
  }
  ctx.drawImage(source, 0, 0, targetW, targetH);

  if ("close" in source && typeof source.close === "function") {
    source.close();
  }

  return canvasToJpegFile(canvas, jpegName);
}

export function uploadNetworkErrorMessage(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  if (/load failed|failed to fetch|networkerror|network request failed/i.test(raw)) {
    return "Falha de rede ao enviar a foto. Confira o Wi‑Fi e se o Mac está com pnpm dev:https.";
  }
  if (raw.trim()) return raw;
  return "Falha ao enviar foto.";
}
