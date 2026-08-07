import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PayWithMercadoPagoButton } from "@/features/checkout/components/PayWithMercadoPagoButton";
import { formatPrice } from "@/features/catalog/format-price";
import {
  getFulfillmentLabel,
  getOrderStatusLabel,
  getPublicOrder,
  isTerminalFailureStatus,
  OrderItemsList,
  OrderProgressBar,
  OrderSupportLink,
  resolveSlaText,
} from "@/features/orders";
import { env } from "@/lib/env";

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
 * Página pública do pedido (T18) — acesso só por `public_code`, sem login.
 * Expande o stub da T15 (D43); rota permanece `/pedido/[codigo]`.
 * CTA Checkout Pro (T16) quando ainda pending_payment.
 */
export default async function PedidoPublicoPage({ params }: PageProps) {
  const { codigo } = await params;
  const order = await getPublicOrder(codigo);

  if (!order) {
    notFound();
  }

  const statusLabel = getOrderStatusLabel(order.status);
  const fulfillmentLabel = getFulfillmentLabel(order.fulfillmentType);
  const slaText = resolveSlaText(
    order.estimatedFulfillment,
    order.fulfillmentType,
  );
  const whatsappNumber = env.NEXT_PUBLIC_STORE_WHATSAPP;
  const awaitingPayment =
    order.status === "pending_payment" && order.paymentStatus === "pending";
  const isFailed = isTerminalFailureStatus(order.status);

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-10 text-center sm:px-8 sm:py-12">
      {!isFailed && !awaitingPayment ? (
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary text-2xl text-primary-foreground">
          ✓
        </div>
      ) : null}
      <p className="font-display mt-4 text-3xl text-primary md:text-4xl">
        {awaitingPayment
          ? "finalize o pagamento"
          : isFailed
            ? statusLabel.toLowerCase()
            : "pagamento confirmado!"}
      </p>
      <h1 className="mt-2 text-2xl font-bold text-foreground">
        {order.publicCode}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Status: <span className="font-medium text-foreground">{statusLabel}</span>
      </p>

      {!isFailed ? (
        <div className="mt-6 rounded-3xl border border-border px-2 py-4 text-left sm:px-3">
          <OrderProgressBar
            status={order.status}
            fulfillmentType={order.fulfillmentType}
          />
        </div>
      ) : (
        <div
          role="status"
          className="mt-6 rounded-3xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-left text-sm text-foreground"
        >
          <p className="font-medium">{statusLabel}</p>
          <p className="mt-1 text-muted-foreground">
            {order.status === "expired"
              ? "Este pedido expirou sem pagamento. Se ainda quiser as peças, monte um novo carrinho."
              : "Este pedido foi cancelado. Fale conosco se precisar de ajuda."}
          </p>
        </div>
      )}

      {awaitingPayment ? (
        <div className="mt-4 rounded-3xl bg-muted/60 px-4 py-4 text-left text-sm text-foreground">
          <p className="font-medium">Finalize o pagamento</p>
          <p className="mt-1 text-muted-foreground">
            Pague com PIX ou cartão no Checkout Pro do Mercado Pago. Após o
            pagamento, a confirmação pode levar alguns segundos.
          </p>
          <div className="mt-4">
            <PayWithMercadoPagoButton publicCode={order.publicCode} />
          </div>
        </div>
      ) : null}

      <section className="mt-6 flex flex-col gap-3 rounded-3xl border border-border p-5 text-left">
        <h2 className="text-base font-bold text-foreground">
          Prazo estimado
        </h2>
        <p className="text-sm text-foreground">{slaText}</p>
        <div className="flex justify-between gap-3 border-t border-border pt-3 text-sm">
          <span className="text-muted-foreground">Recebimento</span>
          <span className="font-medium text-foreground">{fulfillmentLabel}</span>
        </div>
        {order.trackingCode ? (
          <div className="flex justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Rastreio</span>
            <span className="font-medium break-all text-foreground">
              {order.trackingCode}
            </span>
          </div>
        ) : null}
      </section>

      <section className="mt-6 flex flex-col gap-3 rounded-3xl border border-border p-5 text-left">
        <h2 className="text-base font-bold text-foreground">
          Itens
        </h2>
        <OrderItemsList items={order.items} />
        <dl className="flex flex-col gap-2 border-t border-border pt-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="font-medium">{formatPrice(order.subtotalAmount)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Frete</dt>
            <dd className="font-medium">
              {order.shippingAmount === 0
                ? "Grátis"
                : formatPrice(order.shippingAmount)}
            </dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-border pt-2 text-base">
            <dt className="font-bold">Total</dt>
            <dd className="font-bold text-primary">
              {formatPrice(order.totalAmount)}
            </dd>
          </div>
        </dl>
      </section>

      <div className="mt-8 flex flex-col gap-2">
        {whatsappNumber ? (
          <OrderSupportLink
            whatsappNumber={whatsappNumber}
            publicCode={order.publicCode}
          />
        ) : null}
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
