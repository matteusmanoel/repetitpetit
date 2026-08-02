import { ProductCard } from "@/features/catalog/components/ProductCard";
import type { CatalogProduct } from "@/features/catalog/types";

type RelatedProductsCarouselProps = {
  products: CatalogProduct[];
};

/**
 * "Você pode gostar" na PDP — scroll horizontal nativo (snap) em vez do
 * grid do catálogo, para caber mais peças acima da dobra em mobile (T6).
 */
export function RelatedProductsCarousel({ products }: RelatedProductsCarouselProps) {
  return (
    <ul
      className="-mx-4 flex snap-x snap-proximity gap-3 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:-mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
    >
      {products.map((product) => (
        <li key={product.id} className="w-[46%] shrink-0 snap-start sm:w-[220px]">
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
