"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { PROTO_BRANDS } from "../mock-data";
import { useCatalogFiltersPrototype } from "../prototype-state";
import {
  AvailabilityBlock,
  GenderAgeBlock,
  PriceDualSlider,
  SizeBlock,
} from "./FilterBlocks";

type Mode = "more" | "almost-all";

/**
 * Drawer de filtros — `more` = marca+conservação; `almost-all` = Variant C.
 */
export function FiltersSheet({
  mode = "more",
  triggerClassName,
  triggerLabel = "Mais filtros",
}: {
  mode?: Mode;
  triggerClassName?: string;
  triggerLabel?: string;
}) {
  const { filters, patch, activeChipLabels, clearAll } =
    useCatalogFiltersPrototype();
  const [open, setOpen] = useState(false);
  const count =
    mode === "more"
      ? filters.brands.length + filters.conditions.length
      : activeChipLabels.length;

  function toggleBrand(brand: string) {
    const next = filters.brands.includes(brand)
      ? filters.brands.filter((b) => b !== brand)
      : [...filters.brands, brand];
    patch({ brands: next });
  }

  function toggleCondition(c: "novo" | "seminovo" | "bom_estado") {
    const next = filters.conditions.includes(c)
      ? filters.conditions.filter((x) => x !== c)
      : [...filters.conditions, c];
    patch({ conditions: next });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("h-11 gap-2 rounded-full", triggerClassName)}
        >
          <SlidersHorizontal className="size-4" />
          {triggerLabel}
          {count > 0 ? (
            <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {count}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>Filtros</SheetTitle>
        </SheetHeader>
        <div className="mt-4 flex flex-col gap-6 pb-8">
          {mode === "almost-all" ? (
            <>
              <GenderAgeBlock />
              <SizeBlock />
              <AvailabilityBlock />
              <PriceDualSlider stacked />
            </>
          ) : null}

          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Marca
            </p>
            <div className="flex flex-wrap gap-2">
              {PROTO_BRANDS.map((b) => (
                <button
                  key={b}
                  type="button"
                  aria-pressed={filters.brands.includes(b)}
                  onClick={() => toggleBrand(b)}
                  className={cn(
                    "h-10 rounded-full border px-3.5 text-sm font-medium",
                    filters.brands.includes(b)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background",
                  )}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Conservação
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["novo", "Novo"],
                  ["seminovo", "Seminovo"],
                  ["bom_estado", "Bom estado"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={filters.conditions.includes(id)}
                  onClick={() => toggleCondition(id)}
                  className={cn(
                    "h-10 rounded-full border px-3.5 text-sm font-medium",
                    filters.conditions.includes(id)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {mode === "more" ? null : (
            <p className="text-xs text-muted-foreground">
              Variant C: quase tudo no sheet — só chips + Filtrar na tela.
            </p>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-12 flex-1 rounded-full"
              onClick={() => clearAll()}
            >
              Limpar
            </Button>
            <Button
              type="button"
              className="h-12 flex-1 rounded-full"
              onClick={() => setOpen(false)}
            >
              Ver resultados
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function ActiveChipsBar() {
  const { activeChipLabels, clearAll } = useCatalogFiltersPrototype();
  if (activeChipLabels.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {activeChipLabels.map((label) => (
        <span
          key={label}
          className="inline-flex h-8 items-center rounded-full bg-muted px-3 text-xs font-medium text-foreground"
        >
          {label}
        </span>
      ))}
      <button
        type="button"
        className="inline-flex h-8 items-center gap-1 rounded-full px-2 text-xs font-semibold text-primary"
        onClick={clearAll}
      >
        <X className="size-3.5" />
        Limpar
      </button>
    </div>
  );
}
