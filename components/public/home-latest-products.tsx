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
      className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8 sm:py-14"
    >
      <header className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <h2
            id="home-latest-heading"
            className="font-heading text-2xl font-extrabold text-foreground sm:text-3xl"
          >
            Últimas novidades
          </h2>
          <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
            Acabaram de chegar. Peça única — corre antes que acabe!
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          className="h-11 w-full rounded-full sm:w-auto"
        >
          <Link href="/catalogo">Ver catálogo completo</Link>
        </Button>
      </header>

      {products.length === 0 ? (
        <p className="rounded-xl bg-muted px-4 py-8 text-center text-sm text-muted-foreground">
          Novidades em breve. Enquanto isso, fale com a gente no WhatsApp.
        </p>
      ) : (
        <ProductGrid products={products} />
      )}
    </section>
  );
}
