import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductLabel } from "@/components/admin/ProductLabel";
import { ProductLabelPrintActions } from "@/components/admin/ProductLabelPrintActions";
import { requireAdminSession } from "@/features/admin/session";
import { env } from "@/lib/env";
import { generateQRCodeSVG } from "@/lib/qr/generate-qr";
import {
  buildPassportUrl,
  productLabelPdfPath,
} from "@/lib/qr/passport-url";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

export const metadata: Metadata = {
  title: "Imprimir etiqueta — Admin Repeti Petit",
};

type Params = Promise<{ id: string }>;

/**
 * HTML thermal label preview + print (SN-10).
 * PDF fallback: `/admin/produto/[id]/label.pdf`.
 */
export default async function AdminProductLabelPrintPage({
  params,
}: {
  params: Params;
}) {
  await requireAdminSession();

  const { id } = await params;
  const supabase = createServiceSupabaseClient();
  const { data: product } = await supabase
    .from("products")
    .select("id, name, size_label, staff_code")
    .eq("id", id)
    .maybeSingle();

  if (!product || !product.staff_code) {
    notFound();
  }

  const passportUrl = buildPassportUrl(
    env.NEXT_PUBLIC_SITE_URL,
    product.staff_code,
  );
  const qrSvg = await generateQRCodeSVG(passportUrl);
  const pdfHref = productLabelPdfPath(product.id);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <div className="label-print-controls flex flex-col gap-2">
        <Link
          href="/admin/produtos"
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          ← Voltar para produtos
        </Link>
        <h1 className="font-heading text-2xl font-extrabold text-foreground">
          Etiqueta {product.staff_code}
        </h1>
        <p className="text-sm text-muted-foreground">
          Impressão térmica pelo navegador, ou baixe o PDF se a térmica não
          estiver configurada. Sem preço na etiqueta.
        </p>
        <ProductLabelPrintActions pdfHref={pdfHref} />
      </div>

      <div className="flex justify-center rounded-lg border border-border bg-white p-4 print:border-0 print:p-0">
        <ProductLabel
          storeName={env.NEXT_PUBLIC_STORE_NAME}
          staffCode={product.staff_code}
          productName={product.name}
          sizeLabel={product.size_label}
          qrSvg={qrSvg}
        />
      </div>
    </div>
  );
}
