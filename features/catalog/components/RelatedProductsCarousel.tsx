import { ProductCard } from "@/features/catalog/components/ProductCard";
import type { CatalogProduct } from "@/features/catalog/types";

type RelatedProductsCarouselProps = {
  products: CatalogProduct[];
};

/**
 * "você pode gostar também" — grid TipTop (D112) com título Becca no caller.
 */
export function RelatedProductsCarousel({ products }: RelatedProductsCarouselProps) {
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}

type RelatedProductsSectionProps = {
  products: CatalogProduct[];
  headingId?: string;
};

/** Bloco completo com título Becca (PDP + checkout). */
export function RelatedProductsSection({
  products,
  headingId = "related-heading",
}: RelatedProductsSectionProps) {
  if (products.length === 0) return null;

  return (
    <section
      className="mx-auto max-w-6xl px-4 py-8 md:py-10"
      aria-labelledby={headingId}
    >
      <h2
        id={headingId}
        className="font-display mb-5 text-3xl text-primary md:text-4xl"
      >
        você pode gostar também
      </h2>
      <RelatedProductsCarousel products={products} />
    </section>
  );
}
