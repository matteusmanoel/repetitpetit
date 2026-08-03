import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { posSellPath, productEditPath } from "@/lib/qr/passport-url";

export const metadata: Metadata = {
  title: "Override — Admin Repeti Petit",
};

type SearchParams = Promise<{ product?: string }>;

/**
 * Override stub (SN-13). Gate `assertOverrideAllowed` already lives in
 * `features/override` (SN-06 / D83) — this page only reserves the deep link.
 */
export default async function AdminOverrideStubPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const productId = params.product?.trim() ?? "";

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Override</h1>
        <p className="text-sm text-muted-foreground">
          Fluxo de override (cancelar hold / pending_payment com auditoria) será
          entregue em SN-13. O gate de prioridade paid já está em{" "}
          <code className="text-xs">assertOverrideAllowed</code>.
        </p>
      </div>

      {productId ? (
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
          <p className="text-muted-foreground">Peça alvo</p>
          <p className="mt-1 font-mono text-foreground">{productId}</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        {productId ? (
          <>
            <Button asChild variant="secondary" className="h-11 w-full min-h-11">
              <Link href={posSellPath(productId)}>Ir ao POS (após override)</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 w-full min-h-11">
              <Link href={productEditPath(productId)}>Ver peça no admin</Link>
            </Button>
          </>
        ) : null}
        <Button asChild variant="outline" className="h-11 w-full min-h-11">
          <Link href="/admin/produtos">Voltar para produtos</Link>
        </Button>
      </div>
    </div>
  );
}
