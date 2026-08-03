import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { productEditPath } from "@/lib/qr/passport-url";

export const metadata: Metadata = {
  title: "POS — Admin Repeti Petit",
};

type SearchParams = Promise<{ product?: string }>;

/**
 * POS sell stub (SN-08 will replace with full counter UI).
 * Passport "Vender" deep-links here with `?product=<id>`.
 */
export default async function AdminPosStubPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const productId = params.product?.trim() ?? "";

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">POS · balcão</h1>
        <p className="text-sm text-muted-foreground">
          Interface de venda na loja ainda não está pronta (SN-08). A action de
          criar/confirmar pedido já existe (SN-07).
        </p>
      </div>

      {productId ? (
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
          <p className="text-muted-foreground">Peça selecionada</p>
          <p className="mt-1 font-mono text-foreground">{productId}</p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Abra pelo Passaporte (botão Vender) para pré-selecionar a peça.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {productId ? (
          <Button asChild className="h-11 w-full min-h-11">
            <Link href={productEditPath(productId)}>Ver peça no admin</Link>
          </Button>
        ) : null}
        <Button asChild variant="outline" className="h-11 w-full min-h-11">
          <Link href="/admin/produtos">Voltar para produtos</Link>
        </Button>
      </div>
    </div>
  );
}
