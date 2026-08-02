"use client";

import { CheckIcon, ChevronsUpDownIcon, SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type BrandMultiSelectProps = {
  brands: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
};

export function BrandMultiSelect({
  brands,
  selected,
  onChange,
  disabled = false,
}: BrandMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    if (!normalized) return brands;
    return brands.filter((brand) =>
      brand.toLocaleLowerCase("pt-BR").includes(normalized),
    );
  }, [brands, query]);

  const summary =
    selected.length === 0
      ? "Todas as marcas"
      : selected.length === 1
        ? selected[0]
        : `${selected.length} marcas`;

  function toggleBrand(brand: string) {
    if (selected.includes(brand)) {
      onChange(selected.filter((value) => value !== brand));
    } else {
      onChange([...selected, brand]);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || brands.length === 0}
          className="h-11 w-full justify-between px-3 text-left font-normal sm:max-w-xs"
          aria-label={`Filtrar por marca. ${summary}`}
        >
          <span className="truncate">{summary}</span>
          <ChevronsUpDownIcon className="size-4 shrink-0 opacity-60" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85vh] gap-0 p-0 sm:max-h-[70vh]">
        <SheetHeader className="border-b border-border px-4 py-4 text-left">
          <SheetTitle className="font-heading text-lg">Marca</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-3 p-4">
          <div className="relative">
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar marca"
              className="h-11 pl-9 text-base"
              aria-label="Buscar marca"
              autoComplete="off"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {selected.length === 0
                ? "Nenhuma selecionada"
                : `${selected.length} selecionada${selected.length > 1 ? "s" : ""}`}
            </p>
            {selected.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-11 px-3"
                onClick={() => onChange([])}
              >
                Limpar
              </Button>
            ) : null}
          </div>
          <ul
            className="max-h-[50vh] space-y-1 overflow-y-auto overscroll-contain pr-1"
            role="listbox"
            aria-multiselectable="true"
            aria-label="Marcas disponíveis"
          >
            {filtered.length === 0 ? (
              <li className="px-2 py-6 text-center text-sm text-muted-foreground">
                Nenhuma marca encontrada
              </li>
            ) : (
              filtered.map((brand) => {
                const checked = selected.includes(brand);
                return (
                  <li key={brand}>
                    <label
                      className={cn(
                        "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted active:bg-muted/80",
                        checked && "bg-muted",
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleBrand(brand)}
                        aria-label={brand}
                      />
                      <span className="flex-1 text-sm text-foreground">
                        {brand}
                      </span>
                      {checked ? (
                        <CheckIcon
                          className="size-4 text-primary"
                          aria-hidden
                        />
                      ) : null}
                    </label>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}
