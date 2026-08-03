import { NextResponse } from "next/server";

import { renderProductLabelPdf } from "@/features/admin/product-label-pdf";
import { requireAdminSession } from "@/features/admin/session";
import { env } from "@/lib/env";
import { generateQRCodePNG } from "@/lib/qr/generate-qr";
import { buildPassportUrl } from "@/lib/qr/passport-url";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

type Params = Promise<{ id: string }>;

/**
 * GET `/admin/produto/[id]/label.pdf` — SN-10 PDF fallback for thermal print.
 * Requires admin session + product with `staff_code` (D64 / D73).
 * Label has no price.
 */
export async function GET(
  _request: Request,
  context: { params: Params },
) {
  await requireAdminSession();

  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: "Produto inválido." }, { status: 400 });
  }

  const supabase = createServiceSupabaseClient();
  const { data: product, error } = await supabase
    .from("products")
    .select("id, name, size_label, staff_code")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: `Não foi possível carregar o produto: ${error.message}` },
      { status: 500 },
    );
  }

  if (!product) {
    return NextResponse.json(
      { error: "Produto não encontrado." },
      { status: 404 },
    );
  }

  if (!product.staff_code) {
    return NextResponse.json(
      {
        error:
          "Peça sem código RP — ative a peça antes de imprimir a etiqueta.",
      },
      { status: 409 },
    );
  }

  const passportUrl = buildPassportUrl(
    env.NEXT_PUBLIC_SITE_URL,
    product.staff_code,
  );
  const qrPng = await generateQRCodePNG(passportUrl);
  const pdf = await renderProductLabelPdf({
    storeName: env.NEXT_PUBLIC_STORE_NAME,
    staffCode: product.staff_code,
    productName: product.name,
    sizeLabel: product.size_label,
    qrPng,
  });

  const filename = `${product.staff_code}-etiqueta.pdf`;

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
