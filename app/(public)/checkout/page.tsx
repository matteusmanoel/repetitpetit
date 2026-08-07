import type { Metadata } from "next";
import { Suspense } from "react";

import { CheckoutForm } from "@/features/checkout/components/CheckoutForm";
import { RelatedProductsSection } from "@/features/catalog/components/RelatedProductsCarousel";
import { getLatestAvailableProducts } from "@/features/catalog/data";
import { getCheckoutPageData } from "@/features/checkout/data";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Finalize sua compra na Repeti Petit — peça única, sem login.",
};

export default async function CheckoutPage() {
  const [pageData, related] = await Promise.all([
    getCheckoutPageData(),
    getLatestAvailableProducts(4),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:py-10">
      <header className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          Checkout
        </h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          Contato, Sacolinha (padrão) ou entrega, e o resumo das peças
          reservadas — sem endereço na Sacolinha.
        </p>
      </header>

      <Suspense
        fallback={
          <div className="rounded-3xl border border-border px-4 py-10 text-center text-sm text-muted-foreground">
            Carregando seu checkout…
          </div>
        }
      >
        <CheckoutForm pageData={pageData} />
      </Suspense>

      <RelatedProductsSection
        products={related}
        headingId="checkout-related-heading"
      />
    </div>
  );
}
