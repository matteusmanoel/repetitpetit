import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PayWithMercadoPagoButton } from "@/features/checkout/components/PayWithMercadoPagoButton";
import { formatPrice } from "@/features/catalog/format-price";
import { PedidoAuthNudge } from "@/features/buyer/components/PedidoAuthNudge";
import { PedidoPaymentSync } from "@/features/buyer/components/PedidoPaymentSync";
import { getBuyerSession } from "@/features/buyer/session";
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
  searchParams: Promise<{
    status?: string;
    payment_id?: string;
    external_reference?: string;
    preference_id?: string;
  }>;
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

function paymentLabel(paymentStatus: string): string {
  switch (paymentStatus) {
    case "paid":
      return "Pago";
    case "pending":
      return "Pendente";
    case "failed":
      return "Falhou";
    case "refunded":
      return "Estornado";
    case "cancelled":
      return "Cancelado";
    default:
      return paymentStatus;
  }
}

/**
 * Página pública do pedido (T18 / SS-7) — acesso por `public_code`.
 */
export default async function PedidoPublicoPage({
  params,
  searchParams,
}: PageProps) {
  const { codigo } = await params;
  const mpParams = await searchParams;
  const order = await getPublicOrder(codigo);

  if (!order) {
    notFound();
  }

  const buyerSession = await getBuyerSession();
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
  const showAuthNudge = !awaitingPayment && !isFailed;

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-8 text-left sm:px-8 sm:py-10">
      <p className="text-sm font-medium text-primary">Acompanhar pedido</p>
      <h1 className="mt-1 text-2xl font-bold text-foreground">
        {order.publicCode}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Status: <span className="font-medium text-foreground">{statusLabel}</span>
      </p>

      <PedidoPaymentSync
        publicCode={order.publicCode}
        awaitingPayment={awaitingPayment}
        mpReturnStatus={mpParams.status ?? null}
      />

      {!isFailed ? (
        <section
          aria-labelledby="pedido-progresso"
          className="mt-6 rounded-3xl border border-border px-2 py-4 sm:px-3"
        >
          <h2 id="pedido-progresso" className="sr-only">
            Progresso
          </h2>
          <OrderProgressBar
            status={order.status}
            fulfillmentType={order.fulfillmentType}
          />
        </section>
      ) : (
        <div
          role="status"
          className="mt-6 rounded-3xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-foreground"
        >
          <p className="font-medium">{statusLabel}</p>
          <p className="mt-1 text-muted-foreground">
            {order.status === "expired"
              ? "Este pedido expirou sem pagamento. Se ainda quiser as peças, monte um novo carrinho."
              : "Este pedido foi cancelado. Fale conosco se precisar de ajuda."}
          </p>
        </div>
      )}

      <section
        aria-labelledby="pedido-pagamento"
        className="mt-4 rounded-3xl border border-border p-4"
      >
        <h2 id="pedido-pagamento" className="text-base font-bold text-foreground">
          Pagamento
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {paymentLabel(order.paymentStatus)}
        </p>
        {awaitingPayment ? (
          <div className="mt-3">
            <p className="text-sm text-muted-foreground">
              Pague com PIX ou cartão no Checkout Pro do Mercado Pago.
            </p>
            <div className="mt-3">
              <PayWithMercadoPagoButton publicCode={order.publicCode} />
            </div>
          </div>
        ) : null}
      </section>

      <section
        aria-labelledby="pedido-entrega"
        className="mt-4 rounded-3xl border border-border p-4"
      >
        <h2 id="pedido-entrega" className="text-base font-bold text-foreground">
          {order.fulfillmentType === "pickup" ? "Sacolinha" : "Entrega"}
        </h2>
        <p className="mt-1 text-sm text-foreground">{fulfillmentLabel}</p>
        <p className="mt-2 text-sm text-muted-foreground">{slaText}</p>
        {order.trackingCode ? (
          <p className="mt-2 text-sm">
            <span className="text-muted-foreground">Rastreio: </span>
            <span className="font-medium break-all">{order.trackingCode}</span>
          </p>
        ) : null}
        <p className="mt-2 text-sm">
          <span className="text-muted-foreground">Frete: </span>
          <span className="font-medium">
            {order.shippingAmount === 0
              ? "Grátis"
              : formatPrice(order.shippingAmount)}
          </span>
        </p>
      </section>

      <PedidoAuthNudge
        publicCode={order.publicCode}
        customerEmail={order.customerEmail}
        hasBuyerSession={Boolean(buyerSession)}
        showNudge={showAuthNudge}
      />

      <section
        aria-labelledby="pedido-itens"
        className="mt-4 rounded-3xl border border-border p-4"
      >
        <h2 id="pedido-itens" className="text-base font-bold text-foreground">
          Itens
        </h2>
        <div className="mt-3">
          <OrderItemsList items={order.items} />
        </div>
        <dl className="mt-3 flex flex-col gap-2 border-t border-border pt-3 text-sm">
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
          href="/sacolinha"
          className="inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-medium text-foreground hover:bg-muted"
        >
          Minha Sacolinha
        </Link>
      </div>
    </div>
  );
}
