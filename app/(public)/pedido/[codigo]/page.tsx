import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getPublicOrderStub } from "@/features/checkout/order-lookup";
import { formatPrice } from "@/features/catalog/format-price";

type PageProps = {
  params: Promise<{ codigo: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { codigo } = await params;
  return {
    title: `Pedido ${codigo.toUpperCase()}`,
    description: "Acompanhe seu pedido na Repeti Petit.",
  };
}

/**
 * Stub mínimo pós-checkout (T15).
 * Página pública completa (progress bar, itens, WhatsApp) fica para T18.
 */
export default async function PedidoPublicoPage({ params }: PageProps) {
  const { codigo } = await params;
  const order = await getPublicOrderStub(codigo);

  if (!order) {
    notFound();
  }

  const statusLabel =
    order.status === "pending_payment"
      ? "Aguardando pagamento"
      : order.status;

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-8 sm:px-8 sm:py-12">
      <p className="text-sm font-medium text-primary">Repeti Petit</p>
      <h1 className="font-heading mt-1 text-2xl font-extrabold text-foreground">
        Pedido {order.publicCode}
      </h1>

      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-border p-4">
        <div className="flex justify-between gap-3 text-sm">
          <span className="text-muted-foreground">Status</span>
          <span className="font-medium text-foreground">{statusLabel}</span>
        </div>
        <div className="flex justify-between gap-3 text-sm">
          <span className="text-muted-foreground">Total</span>
          <span className="font-heading font-bold text-primary">
            {formatPrice(order.totalAmount)}
          </span>
        </div>
        <div className="flex justify-between gap-3 text-sm">
          <span className="text-muted-foreground">Recebimento</span>
          <span className="font-medium text-foreground">
            {order.fulfillmentType === "pickup" ? "Retirada" : "Entrega"}
          </span>
        </div>
        {order.estimatedFulfillment ? (
          <p className="text-sm text-muted-foreground">
            {order.estimatedFulfillment}
          </p>
        ) : null}
      </div>

      <div className="mt-6 rounded-2xl bg-muted/60 px-4 py-3 text-sm text-foreground">
        <p className="font-medium">Pagamento em breve</p>
        <p className="mt-1 text-muted-foreground">
          O checkout com Mercado Pago (ticket T17) ainda não está ligado. Seu
          pedido já foi criado como <strong>aguardando pagamento</strong>.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Página completa de acompanhamento (T18) será entregue em ticket
          separado — este é um stub pós-redirect do checkout.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-2">
        <Link
          href="/catalogo"
          className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground"
        >
          Continuar comprando
        </Link>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-medium text-foreground hover:bg-muted"
        >
          Voltar à home
        </Link>
      </div>
    </div>
  );
}
