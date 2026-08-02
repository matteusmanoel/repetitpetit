/**
 * Buckets de Storage do app. Nomes reais criados no projeto Supabase via
 * `scripts/setup-storage-buckets.mjs` (ver docs/09-decisions.md). Portados do
 * padrão `lib/supabase/upload.ts` descrito em
 * docs/reference/reuse-map-flordoestudante.md, trocando os nomes de bucket
 * pelos usados por Repeti Petit (`docs/04-data-model.md`: `product_images`,
 * `intake_photos`).
 *
 * Este módulo NÃO é `"server-only"` — as chaves/nomes são seguros para o
 * client (o upload em si continua no Route Handler com service role).
 */
export const UPLOAD_BUCKETS = {
  productImages: "product-images",
  intakePhotos: "intake-photos",
} as const;

export type UploadBucketKey = keyof typeof UPLOAD_BUCKETS;
export type UploadBucketName = (typeof UPLOAD_BUCKETS)[UploadBucketKey];
