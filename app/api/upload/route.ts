import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminSession } from "@/features/admin/session";
import { UPLOAD_BUCKETS, type UploadBucketKey } from "@/lib/supabase/upload-buckets";
import { UploadError, uploadImage } from "@/lib/supabase/upload";

const bucketKeys = Object.keys(UPLOAD_BUCKETS) as [UploadBucketKey, ...UploadBucketKey[]];
const bucketKeySchema = z.enum(bucketKeys);

/** Prefixo opcional dentro do bucket — só segmentos alfanuméricos/hífen. */
const pathPrefixSchema = z
  .string()
  .trim()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/,
    "pathPrefix inválido.",
  )
  .max(120)
  .optional();

/**
 * `POST /api/upload` — recebe um arquivo via `multipart/form-data` e devolve
 * a URL pública no Supabase Storage. Rota admin-only (docs/03-architecture.md,
 * docs/06-agent-playbook.md regra #3): `requireAdminSession()` redireciona
 * para `/admin/login` quando não há sessão de admin válida, do mesmo jeito
 * que qualquer outra rota/action sob `app/admin/(protected)/`.
 *
 * Campos esperados no `FormData`:
 * - `file`: o arquivo de imagem.
 * - `bucket`: uma das chaves de `UPLOAD_BUCKETS` (ex.: "productImages").
 * - `pathPrefix` (opcional): pasta lógica dentro do bucket (ex.: "categories").
 */
export async function POST(request: Request) {
  await requireAdminSession();

  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return NextResponse.json(
      { error: "Envie o upload como multipart/form-data." },
      { status: 400 },
    );
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  }

  const parsedBucket = bucketKeySchema.safeParse(formData.get("bucket"));

  if (!parsedBucket.success) {
    return NextResponse.json(
      { error: `Bucket inválido. Use um de: ${bucketKeys.join(", ")}.` },
      { status: 400 },
    );
  }

  const rawPrefix = formData.get("pathPrefix");
  const parsedPrefix = pathPrefixSchema.safeParse(
    typeof rawPrefix === "string" && rawPrefix.length > 0 ? rawPrefix : undefined,
  );

  if (!parsedPrefix.success) {
    return NextResponse.json(
      { error: "pathPrefix inválido. Use apenas letras, números, hífens e /." },
      { status: 400 },
    );
  }

  const bucket = UPLOAD_BUCKETS[parsedBucket.data];

  try {
    const { publicUrl, path } = await uploadImage({
      bucket,
      file,
      pathPrefix: parsedPrefix.data,
    });

    return NextResponse.json({ url: publicUrl, path });
  } catch (error) {
    if (error instanceof UploadError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Erro inesperado ao enviar imagem:", error);
    return NextResponse.json(
      { error: "Erro inesperado ao enviar a imagem." },
      { status: 500 },
    );
  }
}
