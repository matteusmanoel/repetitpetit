import { NextResponse } from "next/server";

import {
  UPLOAD_BUCKETS,
  UploadError,
  uploadImage,
} from "@/lib/supabase/upload";

/**
 * `POST /api/intake/upload` — upload público e escopado ao bucket
 * `intake-photos` para o formulário `/desapegue`. Sem sessão de admin.
 *
 * Limites: 1 arquivo por request; MIME/tamanho validados em `uploadImage`
 * (JPEG/PNG/WEBP/AVIF, máx. 8MB). O client limita o total a 5 fotos.
 *
 * Ver docs/09-decisions.md D28.
 */
export async function POST(request: Request) {
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

  try {
    const { publicUrl, path } = await uploadImage({
      bucket: UPLOAD_BUCKETS.intakePhotos,
      file,
      pathPrefix: "public",
    });

    return NextResponse.json({ url: publicUrl, path });
  } catch (error) {
    if (error instanceof UploadError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Erro inesperado ao enviar foto de desapego:", error);
    return NextResponse.json(
      { error: "Erro inesperado ao enviar a imagem." },
      { status: 500 },
    );
  }
}
