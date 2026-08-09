"use client";

import { XIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/ui/button";
import {
  EMPTY_CATALOG_FILTERS,
  getActiveFilterChips,
  hasActiveCatalogFilters,
} from "@/features/catalog/filters";
import { useCatalogFilters } from "@/features/catalog/use-catalog-filters";
import { cn } from "@/lib/utils";

type ActiveFilterChipsProps = {
  /** Layout estreito sob o card de filtros (sidebar / mobile). */
  compact?: boolean;
};

export function ActiveFilterChips({ compact = false }: ActiveFilterChipsProps) {
  const { filters, replaceFilters, isPending } = useCatalogFilters();

  if (!hasActiveCatalogFilters(filters)) {
    return null;
  }

  const chips = getActiveFilterChips(filters);

  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        compact && "rounded-2xl border border-border bg-card/60 p-3",
      )}
      data-pending={isPending || undefined}
      aria-busy={isPending || undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">Filtros ativos</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "h-11 min-h-11 px-3 text-sm",
            compact && "h-9 min-h-9 px-2 text-xs",
          )}
          onClick={() => replaceFilters(EMPTY_CATALOG_FILTERS)}
        >
          Limpar tudo
        </Button>
      </div>
      <ul className="flex flex-wrap gap-2" aria-label="Filtros ativos">
        <AnimatePresence initial={false}>
          {chips.map((chip) => (
            <motion.li
              key={chip.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <button
                type="button"
                onClick={() => replaceFilters(chip.remove(filters))}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 text-sm text-foreground transition-colors hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:bg-muted/70",
                  compact
                    ? "h-9 min-h-9 px-2.5 text-xs"
                    : "h-11 min-h-11",
                )}
                aria-label={`Remover filtro ${chip.label}`}
              >
                <span>{chip.label}</span>
                <XIcon className="size-3.5 shrink-0 opacity-70" aria-hidden />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
