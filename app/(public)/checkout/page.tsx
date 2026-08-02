import type { Metadata } from "next";

import { CheckoutForm } from "@/features/checkout/components/CheckoutForm";
import { getCheckoutPageData } from "@/features/checkout/data";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Finalize sua compra na Repeti Petit — peça única, sem login.",
};

export default async function CheckoutPage() {
  const pageData = await getCheckoutPageData();

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-8 sm:py-10">
      <header className="mb-6 flex flex-col gap-1">
        <p className="text-sm font-medium text-primary">Repeti Petit</p>
        <h1 className="font-heading text-2xl font-extrabold text-foreground sm:text-3xl">
          Checkout
        </h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          Uma página só: seus dados, retirada ou entrega, e o resumo das peças
          reservadas. Sem login.
        </p>
      </header>

      <CheckoutForm pageData={pageData} />
    </div>
  );
}
