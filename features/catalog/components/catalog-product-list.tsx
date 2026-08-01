import { CatalogEmptyState } from "@/features/catalog/components/CatalogEmptyState";
import { ProductGrid } from "@/features/catalog/components/ProductGrid";
import { getAvailableProducts } from "@/features/catalog/data";
import {
  hasActiveCatalogFilters,
  type CatalogFilters,
} from "@/features/catalog/filters";

type CatalogProductListProps = {
  filters: CatalogFilters;
};

/** Async Server Component — lista produtos disponíveis do Supabase. */
export async function CatalogProductList({ filters }: CatalogProductListProps) {
  const products = await getAvailableProducts(filters);
  const filtered = hasActiveCatalogFilters(filters);

  if (products.length === 0) {
    return <CatalogEmptyState filtered={filtered} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {products.length}{" "}
        {products.length === 1 ? "peça encontrada" : "peças encontradas"}
        {filtered ? " com os filtros atuais" : " disponíveis"}
      </p>
      <ProductGrid products={products} />
    </div>
  );
}
