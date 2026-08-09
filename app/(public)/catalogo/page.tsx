import type { Metadata } from "next";
import { Suspense } from "react";

import { CatalogFiltersPanel } from "@/features/catalog/components/catalog-filters-panel";
import { CatalogProductList } from "@/features/catalog/components/catalog-product-list";
import { CatalogStatusRealtime } from "@/features/catalog/components/CatalogStatusRealtime";
import { ProductCardSkeletonGrid } from "@/features/catalog/components/ProductCardSkeleton";
import {
  catalogFiltersToQueryString,
  parseCatalogFilters,
  parseCatalogPage,
} from "@/features/catalog/filters";

export const metadata: Metadata = {
  title: "Catálogo — Repeti Petit",
  description:
    "Peças infantis seminovas disponíveis agora. Escolha o tamanho e reserve antes que acabe.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const filters = parseCatalogFilters(params);
  const searchQuery = (firstParam(params.q) ?? "").trim();
  const page = parseCatalogPage(params);
  const listKey = `${catalogFiltersToQueryString(filters)}|q=${searchQuery}|p=${page}`;

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
        {searchQuery ? (
          <p className="text-sm text-muted-foreground">
            Busca:{" "}
            <span className="font-medium text-foreground">{searchQuery}</span>
          </p>
        ) : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr] lg:gap-8">
        <CatalogFiltersPanel />

        <div className="flex min-w-0 flex-col gap-4">
          <Suspense key={listKey} fallback={<ProductCardSkeletonGrid />}>
            <CatalogProductList
              filters={filters}
              searchQuery={searchQuery}
              page={page}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
