import { Suspense } from "react";

import { ActiveFilterChips } from "@/features/catalog/components/ActiveFilterChips";
import { CatalogFilters } from "@/features/catalog/components/CatalogFilters";
import { getAvailableBrands } from "@/features/catalog/data";

/**
 * Painel de filtros + chips ativos.
 * Suspense interno porque os clients leem `useSearchParams`.
 */
export async function CatalogFiltersPanel() {
  const brands = await getAvailableBrands();

  return (
    <div className="flex flex-col gap-4">
      <Suspense
        fallback={
          <div
            className="h-48 animate-pulse rounded-xl border border-border bg-muted/60"
            aria-hidden
          />
        }
      >
        <CatalogFilters brands={brands} />
      </Suspense>
      <Suspense fallback={null}>
        <ActiveFilterChips />
      </Suspense>
    </div>
  );
}
