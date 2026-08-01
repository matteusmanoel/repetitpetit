import "server-only";

import {
  UPLOAD_BUCKETS,
  type UploadBucketKey,
  type UploadBucketName,
} from "@/lib/supabase/upload-buckets";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

export { UPLOAD_BUCKETS, type UploadBucketKey, type UploadBucketName };

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

/** Erro esperado (arquivo inválido, falha do Storage) — mensagem já em pt-BR, segura para devolver ao client. */
export class UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadError";
  }
}

export type UploadImageInput = {
  bucket: UploadBucketName;
  file: File;
  /** Prefixo opcional do caminho dentro do bucket, ex.: o id do produto/intake. */
  pathPrefix?: string;
};

export type UploadImageResult = {
  path: string;
  publicUrl: string;
};

function assertValidImage(file: File): void {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new UploadError(
      "Formato de imagem não suportado. Envie um arquivo JPEG, PNG, WEBP ou AVIF.",
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new UploadError("Imagem muito grande. O tamanho máximo permitido é 8MB.");
  }
}

/**
 * Faz upload de uma imagem para um bucket do Supabase Storage e retorna a
 * URL pública do arquivo.
 *
 * Usa `createServiceSupabaseClient()` (service role, bypassa RLS) — nunca
 * expor esta função a código client-side. Callers autorizados:
 * - `POST /api/upload` (admin, qualquer bucket de `UPLOAD_BUCKETS`)
 * - `POST /api/intake/upload` (público, somente `intake-photos` — D28)
 */
export async function uploadImage({
  bucket,
  file,
  pathPrefix,
}: UploadImageInput): Promise<UploadImageResult> {
  assertValidImage(file);

  const extension = EXTENSION_BY_MIME_TYPE[file.type] ?? "bin";
  const fileName = `${crypto.randomUUID()}.${extension}`;
  const path = pathPrefix ? `${pathPrefix}/${fileName}` : fileName;

  const supabase = createServiceSupabaseClient();

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    throw new UploadError(`Falha ao enviar a imagem: ${uploadError.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path);

  return { path, publicUrl };
}
