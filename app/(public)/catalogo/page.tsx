import type { Metadata } from "next";
import { Suspense } from "react";

import { ActiveFilterChips } from "@/features/catalog/components/ActiveFilterChips";
import { CatalogFiltersPanel } from "@/features/catalog/components/catalog-filters-panel";
import { CatalogProductList } from "@/features/catalog/components/catalog-product-list";
import { CatalogStatusRealtime } from "@/features/catalog/components/CatalogStatusRealtime";
import { ProductCardSkeletonGrid } from "@/features/catalog/components/ProductCardSkeleton";
import {
  catalogFiltersToQueryString,
  parseCatalogFilters,
} from "@/features/catalog/filters";

export const metadata: Metadata = {
  title: "Catálogo — Repeti Petit",
  description:
    "Peças infantis seminovas disponíveis agora. Escolha o tamanho e reserve antes que acabe.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const filters = parseCatalogFilters(params);
  const listKey = catalogFiltersToQueryString(filters) || "all";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:py-8">
      <CatalogStatusRealtime />
      <header className="mb-4 flex flex-col gap-1 sm:mb-6">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          Catálogo
        </h1>
        <p className="max-w-xl text-sm text-primary md:text-base">
          Peças únicas — filtre e reserve antes que acabe.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[220px_1fr] md:gap-8">
        <CatalogFiltersPanel />

        <div className="flex flex-col gap-4">
          <Suspense fallback={null}>
            <ActiveFilterChips />
          </Suspense>

          <Suspense key={listKey} fallback={<ProductCardSkeletonGrid />}>
            <CatalogProductList filters={filters} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
