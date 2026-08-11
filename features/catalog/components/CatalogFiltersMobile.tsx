"use client";

import { SlidersHorizontalIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CatalogFilters } from "@/features/catalog/components/CatalogFilters";
import {
  EMPTY_CATALOG_FILTERS,
  getActiveFilterChips,
  type CatalogFilters as CatalogFiltersType,
} from "@/features/catalog/filters";
import { useCatalogFilters } from "@/features/catalog/use-catalog-filters";

type CatalogFiltersMobileProps = {
  brands: string[];
};

/**
 * Drawer inferior de filtros para mobile/tablet (docs/05-ux-direction.md).
 * Seleções ficam em draft local; URL só atualiza em “Ver resultados”.
 */
export function CatalogFiltersMobile({ brands }: CatalogFiltersMobileProps) {
  const [open, setOpen] = useState(false);
  const { filters, replaceFilters } = useCatalogFilters();
  const [draft, setDraft] = useState<CatalogFiltersType>(filters);
  const draftCount = getActiveFilterChips(draft).length;
  const activeCount = getActiveFilterChips(filters).length;
  const hideTrigger = brands.length === 0 && activeCount === 0;

  useEffect(() => {
    if (open) {
      setDraft(filters);
    }
  }, [open, filters]);

  if (hideTrigger) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full justify-center gap-2 rounded-full"
        >
          <SlidersHorizontalIcon className="size-4" aria-hidden />
          Filtros
          {activeCount > 0 ? (
            <Badge className="h-5 min-w-5 rounded-full bg-primary px-1.5 text-primary-foreground">
              {activeCount}
            </Badge>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="flex max-h-[88vh] flex-col gap-0 overflow-hidden p-0"
      >
        <SheetHeader className="shrink-0 border-b border-border px-4 py-4 text-left">
          <SheetTitle className="font-heading text-lg">Filtros</SheetTitle>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <CatalogFilters
            brands={brands}
            value={draft}
            onChange={setDraft}
          />
        </div>

        <SheetFooter className="shrink-0 gap-2 border-t border-border bg-background sm:flex-col">
          {draftCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              className="h-11 w-full rounded-full"
              onClick={() => setDraft(EMPTY_CATALOG_FILTERS)}
            >
              Limpar filtros
            </Button>
          ) : null}
          <Button
            type="button"
            size="lg"
            className="h-12 w-full rounded-full text-base font-medium"
            onClick={() => {
              replaceFilters(draft);
              setOpen(false);
            }}
          >
            Ver resultados
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
