import { ProductCard } from "@/features/catalog/components/ProductCard";
import type { CatalogProduct } from "@/features/catalog/types";

type ProductGridProps = {
  products: CatalogProduct[];
};

export function ProductGrid({ products }: ProductGridProps) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
      {products.map((product, index) => (
        <li key={product.id} className="h-full">
          <ProductCard product={product} priority={index < 3} />
        </li>
      ))}
    </ul>
  );
}
