"use client";

import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  EMPTY_CATALOG_FILTERS,
  getActiveFilterChips,
  hasActiveCatalogFilters,
} from "@/features/catalog/filters";
import { useCatalogFilters } from "@/features/catalog/use-catalog-filters";

export function ActiveFilterChips() {
  const { filters, replaceFilters, isPending } = useCatalogFilters();

  if (!hasActiveCatalogFilters(filters)) {
    return null;
  }

  const chips = getActiveFilterChips(filters);

  return (
    <div
      className="flex flex-col gap-2"
      data-pending={isPending || undefined}
      aria-busy={isPending || undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">Filtros ativos</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-11 min-h-11 px-3 text-sm"
          onClick={() => replaceFilters(EMPTY_CATALOG_FILTERS)}
        >
          Limpar tudo
        </Button>
      </div>
      <ul className="flex flex-wrap gap-2" aria-label="Filtros ativos">
        {chips.map((chip) => (
          <li key={chip.id}>
            <button
              type="button"
              onClick={() => replaceFilters(chip.remove(filters))}
              className="inline-flex h-11 min-h-11 items-center gap-1.5 rounded-full border border-border bg-muted px-3 text-sm text-foreground transition-colors hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:bg-muted/70"
              aria-label={`Remover filtro ${chip.label}`}
            >
              <span>{chip.label}</span>
              <XIcon className="size-3.5 shrink-0 opacity-70" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
