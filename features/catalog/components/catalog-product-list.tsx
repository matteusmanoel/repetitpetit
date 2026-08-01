import { CatalogEmptyState } from "@/features/catalog/components/CatalogEmptyState";
import { ProductGrid } from "@/features/catalog/components/ProductGrid";
import { getAvailableProducts } from "@/features/catalog/data";

/** Async Server Component — lista produtos disponíveis do Supabase. */
export async function CatalogProductList() {
  const products = await getAvailableProducts();

  if (products.length === 0) {
    return <CatalogEmptyState />;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {products.length}{" "}
        {products.length === 1 ? "peça disponível" : "peças disponíveis"}
      </p>
      <ProductGrid products={products} />
    </div>
  );
}
