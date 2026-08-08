"use client";

import { EssentialFiltersRow } from "../shared/FilterBlocks";
import {
  ActiveChipsBar,
  FiltersSheet,
} from "../shared/FiltersSheet";
import { ProtoHeader } from "../shared/ProtoHeader";
import { ProtoProductGrid } from "../shared/ProtoProductGrid";
import { useCatalogFiltersPrototype } from "../prototype-state";

/** A — Faixa horizontal acima do grid. */
export function VariantA() {
  const { filtered } = useCatalogFiltersPrototype();

  return (
    <div className="min-h-screen bg-background pb-24 font-sans">
      <ProtoHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <header className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">
              Catálogo
            </h1>
            <p className="text-sm text-primary">
              Variante A — faixa de filtros acima da grade
            </p>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {filtered.length} peças
            </p>
            <FiltersSheet mode="more" />
          </div>
        </header>

        <div className="mb-4">
          <EssentialFiltersRow />
        </div>
        <div className="mb-4">
          <ActiveChipsBar />
        </div>
        <ProtoProductGrid />
      </main>
    </div>
  );
}
