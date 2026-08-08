"use client";

import { cn } from "@/lib/utils";

import { useCatalogFiltersPrototype } from "../prototype-state";

export function ProtoProductGrid() {
  const { filtered } = useCatalogFiltersPrototype();

  if (filtered.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
        <p className="text-base font-semibold text-foreground">
          Nenhuma peça com esses filtros
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajuste sexo, idade, tamanho ou preço.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 md:gap-4">
      {filtered.map((p) => (
        <li
          key={p.id}
          className={cn(
            "flex h-[280px] flex-col overflow-hidden rounded-2xl border-2 border-border bg-card",
            !p.available && "opacity-70",
          )}
        >
          <div
            className="aspect-[3/4] w-full shrink-0"
            style={{ background: p.hue }}
            aria-hidden
          />
          <div className="flex min-h-0 flex-1 flex-col gap-0.5 p-3">
            <p className="text-[11px] text-muted-foreground">
              {p.brand} · {p.size}
            </p>
            <p className="truncate text-sm font-semibold text-foreground">
              {p.name}
            </p>
            <div className="mt-auto flex items-end justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {p.available ? "Disponível" : "Reservada"}
              </span>
              <span className="text-sm font-bold text-primary">
                R$ {p.price}
              </span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
