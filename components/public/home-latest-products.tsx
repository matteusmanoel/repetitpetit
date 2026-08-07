import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/features/catalog/components/ProductGrid";
import type { CatalogProduct } from "@/features/catalog/types";

type HomeLatestProductsProps = {
  products: CatalogProduct[];
};

export function HomeLatestProducts({ products }: HomeLatestProductsProps) {
  return (
    <section
      aria-labelledby="home-latest-heading"
      className="mx-auto w-full max-w-6xl px-4 pb-6 md:px-4"
    >
      <header className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <h2
          id="home-latest-heading"
          className="font-display text-3xl text-primary md:text-4xl"
        >
          novidades da semana!
        </h2>
        <Button
          asChild
          variant="outline"
          className="h-11 w-full rounded-full border-primary text-primary sm:w-auto"
        >
          <Link href="/catalogo">Ver catálogo completo</Link>
        </Button>
      </header>

      {products.length === 0 ? (
        <p className="rounded-2xl bg-muted px-4 py-8 text-center text-sm text-muted-foreground">
          Novidades em breve. Enquanto isso, fale com a gente no WhatsApp.
        </p>
      ) : (
        <ProductGrid products={products} />
      )}
    </section>
  );
}
