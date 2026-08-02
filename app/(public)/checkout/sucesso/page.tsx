import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CheckoutSuccessClient } from "@/app/(public)/checkout/sucesso/CheckoutSuccessClient";
import { getOrderPaymentStatus } from "@/features/payments/get-order-payment-status";

type PageProps = {
  searchParams: Promise<{
    codigo?: string;
    status?: string;
    payment_id?: string;
    external_reference?: string;
    preference_id?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Pagamento",
  description: "Confirmação de pagamento — Repeti Petit.",
};

/**
 * Back URL do Checkout Pro (`back_urls` + `auto_return`).
 * Mostra estado "processando" até o webhook (#18) confirmar o pagamento.
 */
export default async function CheckoutSucessoPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const codigo =
    params.codigo?.trim() ||
    params.external_reference?.trim() ||
    "";

  if (!codigo) {
    return (
      <div className="mx-auto w-full max-w-lg flex-1 px-4 py-8 sm:px-8 sm:py-12">
        <h1 className="font-heading text-2xl font-extrabold text-foreground">
          Pagamento
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Não encontramos o código do pedido nesta volta do Mercado Pago.
        </p>
        <Link
          href="/catalogo"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground"
        >
          Ir ao catálogo
        </Link>
      </div>
    );
  }

  const order = await getOrderPaymentStatus(codigo);

  if (!order) {
    notFound();
  }

  return (
    <CheckoutSuccessClient
      publicCode={order.publicCode}
      initialOrderStatus={order.orderStatus}
      initialPaymentStatus={order.paymentStatus}
      totalAmount={order.totalAmount}
      mpReturnStatus={params.status ?? null}
    />
  );
}
