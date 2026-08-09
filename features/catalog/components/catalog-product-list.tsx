import { Suspense } from "react";

import { CatalogEmptyState } from "@/features/catalog/components/CatalogEmptyState";
import { CatalogPagination } from "@/features/catalog/components/CatalogPagination";
import { ProductGrid } from "@/features/catalog/components/ProductGrid";
import { getAvailableProducts } from "@/features/catalog/data";
import {
  CATALOG_PAGE_SIZE,
  hasActiveCatalogFilters,
  type CatalogFilters,
} from "@/features/catalog/filters";

type CatalogProductListProps = {
  filters: CatalogFilters;
  searchQuery?: string;
  page?: number;
};

/** Async Server Component — lista produtos disponíveis do Supabase (máx. 9/página). */
export async function CatalogProductList({
  filters,
  searchQuery,
  page = 1,
}: CatalogProductListProps) {
  const products = await getAvailableProducts(filters, { searchQuery });
  const filtered =
    hasActiveCatalogFilters(filters) || Boolean(searchQuery?.trim());

  if (products.length === 0) {
    return <CatalogEmptyState filtered={filtered} />;
  }

  const totalPages = Math.max(
    1,
    Math.ceil(products.length / CATALOG_PAGE_SIZE),
  );
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * CATALOG_PAGE_SIZE;
  const pageProducts = products.slice(start, start + CATALOG_PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {products.length}{" "}
        {products.length === 1 ? "peça encontrada" : "peças encontradas"}
        {filtered ? " com os filtros atuais" : ""}
        {totalPages > 1
          ? ` · página ${safePage} de ${totalPages}`
          : ""}
      </p>
      <ProductGrid products={pageProducts} />
      <Suspense fallback={null}>
        <CatalogPagination page={safePage} totalPages={totalPages} />
      </Suspense>
    </div>
  );
}
