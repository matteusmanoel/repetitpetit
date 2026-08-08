"use client";

import { EssentialFiltersColumn } from "../shared/FilterBlocks";
import {
  ActiveChipsBar,
  FiltersSheet,
} from "../shared/FiltersSheet";
import { ProtoHeader } from "../shared/ProtoHeader";
import { ProtoProductGrid } from "../shared/ProtoProductGrid";
import { useCatalogFiltersPrototype } from "../prototype-state";

/** B — Coluna sticky slim à esquerda. */
export function VariantB() {
  const { filtered } = useCatalogFiltersPrototype();

  return (
    <div className="min-h-screen bg-background pb-24 font-sans">
      <ProtoHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <header className="mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">
              Catálogo
            </h1>
            <p className="text-sm text-primary">
              Variante B — sticky slim + grid respira
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {filtered.length} peças
          </p>
        </header>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <aside className="w-full shrink-0 lg:sticky lg:top-28 lg:w-[200px]">
            <div className="rounded-2xl border border-border bg-card/70 p-4">
              <EssentialFiltersColumn />
              <div className="mt-5">
                <FiltersSheet
                  mode="more"
                  triggerClassName="w-full justify-center"
                  triggerLabel="Marca e conservação"
                />
              </div>
            </div>
          </aside>

          <div className="min-w-0 flex-1 space-y-4">
            <ActiveChipsBar />
            {/* Mobile: sheet access without sticky */}
            <div className="lg:hidden">
              <FiltersSheet mode="more" triggerLabel="Mais filtros" />
            </div>
            <ProtoProductGrid />
          </div>
        </div>
      </main>
    </div>
  );
}
