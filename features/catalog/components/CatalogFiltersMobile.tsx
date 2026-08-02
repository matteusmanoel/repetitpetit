"use client";

import { SlidersHorizontalIcon } from "lucide-react";
import { useState } from "react";

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
import { getActiveFilterChips } from "@/features/catalog/filters";
import { useCatalogFilters } from "@/features/catalog/use-catalog-filters";

type CatalogFiltersMobileProps = {
  brands: string[];
};

/**
 * Drawer inferior de filtros para mobile/tablet (docs/05-ux-direction.md).
 * Reusa o `Sheet` (side="bottom") já usado em `BrandMultiSelect`/`CartSheet`
 * em vez de instalar um componente `Drawer` (vaul) novo — mesma primitiva,
 * zero dependência extra.
 */
export function CatalogFiltersMobile({ brands }: CatalogFiltersMobileProps) {
  const [open, setOpen] = useState(false);
  const { filters } = useCatalogFilters();
  const activeCount = getActiveFilterChips(filters).length;

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
        className="max-h-[88vh] gap-0 overflow-y-auto p-0"
      >
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <SheetTitle className="font-heading text-lg">Filtros</SheetTitle>
        </SheetHeader>

        <div className="px-4 py-4">
          <CatalogFilters brands={brands} />
        </div>

        <SheetFooter className="border-t border-border">
          <Button
            type="button"
            size="lg"
            className="h-12 w-full rounded-full text-base font-medium"
            onClick={() => setOpen(false)}
          >
            Ver resultados
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
