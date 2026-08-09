import { Suspense } from "react";

import { ActiveFilterChips } from "@/features/catalog/components/ActiveFilterChips";
import { CatalogFilters } from "@/features/catalog/components/CatalogFilters";
import { CatalogFiltersMobile } from "@/features/catalog/components/CatalogFiltersMobile";
import { getAvailableBrands } from "@/features/catalog/data";

/**
 * Painel de filtros — sidebar sticky no desktop (`lg+`), drawer no
 * mobile/tablet. Chips ativos ficam abaixo do card (sem pular o grid).
 */
export async function CatalogFiltersPanel() {
  const brands = await getAvailableBrands();

  return (
    <>
      {brands.length > 0 ? (
        <aside className="hidden max-h-[calc(100vh-11.5rem)] lg:sticky lg:top-44 lg:z-10 lg:block lg:self-start lg:overflow-y-auto lg:overscroll-contain">
          <div className="flex flex-col gap-3">
            <Suspense fallback={<FiltersSidebarFallback />}>
              <CatalogFilters brands={brands} />
            </Suspense>
            <Suspense fallback={null}>
              <ActiveFilterChips compact />
            </Suspense>
          </div>
        </aside>
      ) : null}

      <div className="flex flex-col gap-3 lg:hidden">
        <Suspense fallback={null}>
          <CatalogFiltersMobile brands={brands} />
        </Suspense>
        <Suspense fallback={null}>
          <ActiveFilterChips compact />
        </Suspense>
      </div>
    </>
  );
}

function FiltersSidebarFallback() {
  return (
    <div
      className="h-[560px] w-full animate-pulse rounded-2xl border border-border bg-muted/60"
      aria-hidden
    />
  );
}
