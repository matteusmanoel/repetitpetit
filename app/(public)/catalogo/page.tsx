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
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
      <CatalogStatusRealtime />
      <header className="mb-6 flex flex-col gap-2 sm:mb-8">
        <h1 className="font-heading text-2xl font-extrabold text-foreground sm:text-3xl">
          Catálogo
        </h1>
        <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
          Peças únicas, escolhidas com carinho. Filtre por tamanho e finalize
          em segundos — mais recentes primeiro.
        </p>
      </header>

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[260px_1fr] lg:items-start lg:gap-8">
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
