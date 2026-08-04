import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OverrideActionButton } from "@/components/admin/OverrideActionButton";
import { Button } from "@/components/ui/button";
import { requireAdminSession } from "@/features/admin/session";
import { posSellPath, productEditPath } from "@/lib/qr/passport-url";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

export const metadata: Metadata = {
  title: "Override — Admin Repeti Petit",
};

type SearchParams = Promise<{ product?: string }>;

/**
 * Override deep link from Garment Passport (SN-11 / SN-13 / D85).
 * Hosts `OverrideActionButton` for hold / pending_payment cancel + audit.
 */
export default async function AdminOverridePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminSession();

  const params = await searchParams;
  const productId = params.product?.trim() ?? "";

  if (!productId) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <h1 className="text-xl font-semibold text-foreground">Override</h1>
        <p className="text-sm text-muted-foreground">
          Informe a peça via{" "}
          <code className="text-xs">/admin/override?product=&lt;id&gt;</code>{" "}
          (link do Passaporte).
        </p>
        <Button asChild variant="outline" className="h-11 w-full min-h-11">
          <Link href="/admin/produtos">Voltar para produtos</Link>
        </Button>
      </div>
    );
  }

  const supabase = createServiceSupabaseClient();
  const { data: product, error } = await supabase
    .from("products")
    .select("id, name, staff_code, status")
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    console.error("AdminOverridePage product:", error);
  }

  if (!product) {
    notFound();
  }

  const { data: orderItemRows } = await supabase
    .from("order_items")
    .select("order_id")
    .eq("product_id", product.id);

  const orderIds = [
    ...new Set(
      (orderItemRows ?? [])
        .map((row) => row.order_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];

  let hasPendingOnlineOrder = false;
  if (orderIds.length > 0) {
    const { count: pendingCount } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("id", orderIds)
      .eq("channel", "online")
      .eq("status", "pending_payment");
    hasPendingOnlineOrder = (pendingCount ?? 0) > 0;
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Override</h1>
        <p className="text-sm text-muted-foreground">
          Cancela hold e/ou pagamento online pendente com auditoria mínima
          (D62 / D72 / D85). Pedidos já pagos são bloqueados.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
        <p className="text-muted-foreground">Peça</p>
        <p className="mt-1 font-medium text-foreground">{product.name}</p>
        {product.staff_code ? (
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {product.staff_code}
          </p>
        ) : null}
        <p className="mt-2 text-xs text-muted-foreground">
          Status: <span className="font-medium text-foreground">{product.status}</span>
          {hasPendingOnlineOrder ? " · pedido online pendente" : null}
        </p>
      </div>

      <OverrideActionButton
        productId={product.id}
        productStatus={product.status}
        hasPendingOnlineOrder={hasPendingOnlineOrder}
        onSuccessHref={posSellPath(product.id)}
        className="h-11 w-full min-h-11"
      />

      <div className="flex flex-col gap-2">
        <Button asChild variant="secondary" className="h-11 w-full min-h-11">
          <Link href={posSellPath(product.id)}>Ir ao POS</Link>
        </Button>
        <Button asChild variant="outline" className="h-11 w-full min-h-11">
          <Link href={productEditPath(product.id)}>Ver peça no admin</Link>
        </Button>
        <Button asChild variant="outline" className="h-11 w-full min-h-11">
          <Link href="/admin/produtos">Voltar para produtos</Link>
        </Button>
      </div>
    </div>
  );
}
