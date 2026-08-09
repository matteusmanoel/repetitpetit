"use client";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { ProductCard } from "@/features/catalog/components/ProductCard";
import type { CatalogProduct } from "@/features/catalog/types";

type RelatedProductsSectionProps = {
  products: CatalogProduct[];
  headingId?: string;
};

/**
 * "você pode gostar também" — uma linha + carrossel (D112).
 * Sem quebra de linha; prev/next no título para atualizar a faixa.
 */
export function RelatedProductsSection({
  products,
  headingId = "related-heading",
}: RelatedProductsSectionProps) {
  if (products.length === 0) return null;

  const showControls = products.length > 2;

  return (
    <section
      className="mx-auto max-w-6xl px-4 py-8 md:py-10"
      aria-labelledby={headingId}
    >
      <Carousel
        opts={{
          align: "start",
          dragFree: true,
          containScroll: "trimSnaps",
        }}
        className="w-full"
      >
        <div className="mb-5 flex items-end justify-between gap-3">
          <h2
            id={headingId}
            className="font-display text-3xl text-primary md:text-4xl"
          >
            você pode gostar também
          </h2>
          {showControls ? (
            <div className="flex shrink-0 items-center gap-2 pb-1">
              <CarouselPrevious
                className="static inset-auto size-10 translate-none border-border bg-card text-foreground shadow-sm hover:bg-muted disabled:opacity-30"
                aria-label="Peças anteriores"
              />
              <CarouselNext
                className="static inset-auto size-10 translate-none border-border bg-card text-foreground shadow-sm hover:bg-muted disabled:opacity-30"
                aria-label="Próximas peças"
              />
            </div>
          ) : null}
        </div>

        <CarouselContent className="-ml-3 md:-ml-5">
          {products.map((product) => (
            <CarouselItem
              key={product.id}
              className="basis-[min(100%,11.5rem)] pl-3 sm:basis-1/2 md:basis-1/3 md:pl-5 lg:basis-1/4"
            >
              <ProductCard product={product} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  );
}
