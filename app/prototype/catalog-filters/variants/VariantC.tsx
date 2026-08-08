"use client";

import { cn } from "@/lib/utils";

import { GENDER_LABELS, type ProtoGender } from "../mock-data";
import { useCatalogFiltersPrototype } from "../prototype-state";
import {
  ActiveChipsBar,
  FiltersSheet,
} from "../shared/FiltersSheet";
import { ProtoHeader } from "../shared/ProtoHeader";
import { ProtoProductGrid } from "../shared/ProtoProductGrid";

const GENDER_ACTIVE: Record<ProtoGender, string> = {
  menino: "bg-[var(--brand-blue)] text-white border-transparent",
  menina: "bg-[var(--brand-pink)] text-white border-transparent",
  unissex: "bg-[var(--brand-green)] text-white border-transparent",
};

/** C — Chips ativos + Filtrar sheet; presets de gênero fora. */
export function VariantC() {
  const { filters, patch, filtered } = useCatalogFiltersPrototype();
  const genders = Object.keys(GENDER_LABELS) as ProtoGender[];

  return (
    <div className="min-h-screen bg-background pb-24 font-sans">
      <ProtoHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <header className="mb-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground md:text-3xl">
                Catálogo
              </h1>
              <p className="text-sm text-primary">
                Variante C — tela limpa, quase tudo no sheet
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              {filtered.length} peças
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {genders.map((g) => (
              <button
                key={g}
                type="button"
                aria-pressed={filters.gender === g}
                onClick={() =>
                  patch({ gender: filters.gender === g ? null : g })
                }
                className={cn(
                  "inline-flex h-10 items-center rounded-full border px-3.5 text-sm font-semibold",
                  filters.gender === g
                    ? GENDER_ACTIVE[g]
                    : "border-border bg-background text-foreground",
                )}
              >
                {GENDER_LABELS[g]}
              </button>
            ))}
            <FiltersSheet
              mode="almost-all"
              triggerLabel="Filtrar"
              triggerClassName="ml-auto"
            />
          </div>

          <ActiveChipsBar />
        </header>

        <ProtoProductGrid />
      </main>
    </div>
  );
}
