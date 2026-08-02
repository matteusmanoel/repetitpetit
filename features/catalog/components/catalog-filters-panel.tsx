import { Suspense } from "react";

import { CatalogFilters } from "@/features/catalog/components/CatalogFilters";
import { CatalogFiltersMobile } from "@/features/catalog/components/CatalogFiltersMobile";
import { getAvailableBrands } from "@/features/catalog/data";

/**
 * Painel de filtros — sidebar fixa no desktop (`lg+`), drawer inferior no
 * mobile/tablet (docs/05-ux-direction.md). Suspense interno porque os
 * clients leem `useSearchParams`.
 */
export async function CatalogFiltersPanel() {
  const brands = await getAvailableBrands();

  return (
    <>
      <aside className="hidden lg:sticky lg:top-24 lg:block">
        <Suspense fallback={<FiltersSidebarFallback />}>
          <CatalogFilters brands={brands} />
        </Suspense>
      </aside>

      <div className="lg:hidden">
        <Suspense fallback={null}>
          <CatalogFiltersMobile brands={brands} />
        </Suspense>
      </div>
    </>
  );
}

function FiltersSidebarFallback() {
  return (
    <div
      className="h-[560px] w-[260px] animate-pulse rounded-2xl border border-border bg-muted/60"
      aria-hidden
    />
  );
}
