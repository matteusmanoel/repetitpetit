"use client";

import Link from "next/link";
import { Menu, Search, ShoppingBag, X } from "lucide-react";
import { useRef } from "react";

import { BrandLogo } from "@/components/shared/BrandEmptyState";
import { cn } from "@/lib/utils";

import { useCatalogFiltersPrototype } from "../prototype-state";

/**
 * PROTOTYPE header + search autocomplete (same chrome in A/B/C).
 */
export function ProtoHeader() {
  const {
    query,
    setQuery,
    searchOpen,
    setSearchOpen,
    suggestions,
  } = useCatalogFiltersPrototype();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 md:gap-5 md:py-4">
        <button
          type="button"
          className="text-primary md:hidden"
          aria-label="Menu (protótipo)"
        >
          <Menu className="size-7" strokeWidth={1.75} />
        </button>

        <Link href="/" className="shrink-0" aria-label="Repeti Petit">
          <BrandLogo className="!h-auto w-[min(200px,50vw)] max-w-[200px]" />
        </Link>

        <div className="relative hidden min-w-0 flex-1 sm:block">
          <div className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2.5">
            <Search className="size-5 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => {
                window.setTimeout(() => setSearchOpen(false), 150);
              }}
              placeholder="Buscar peças, marcas…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              aria-label="Buscar peças"
              aria-controls="proto-search-listbox"
            />
            {query ? (
              <button
                type="button"
                className="text-muted-foreground"
                aria-label="Limpar busca"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setQuery("")}
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          {searchOpen ? (
            <div
              id="proto-search-listbox"
              className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
              role="listbox"
            >
              <ul className="max-h-72 overflow-auto py-1">
                {suggestions.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={query === p.name}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/70"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setQuery(p.name);
                        setSearchOpen(false);
                      }}
                    >
                      <span
                        className="size-10 shrink-0 rounded-lg"
                        style={{ background: p.hue }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {p.name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {p.brand} · {p.size} · R$ {p.price}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="border-t border-border px-3 py-2">
                <button
                  type="button"
                  className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setSearchOpen(false)}
                >
                  Ver todos no catálogo
                  {query.trim() ? ` “${query.trim()}”` : ""}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="relative ml-auto text-primary sm:ml-0"
          aria-label="Sacolinha"
        >
          <ShoppingBag className="size-6" strokeWidth={1.75} />
          <span
            className={cn(
              "absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-[var(--brand-pink)] text-[10px] font-bold text-white",
            )}
          >
            2
          </span>
        </button>
      </div>

      {/* Mobile search */}
      <div className="border-t border-border px-4 py-2 sm:hidden">
        <div className="relative flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Buscar peças…"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        {searchOpen ? (
          <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
            <ul className="max-h-56 overflow-auto py-1">
              {suggestions.slice(0, 6).map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
                    onClick={() => {
                      setQuery(p.name);
                      setSearchOpen(false);
                    }}
                  >
                    <span
                      className="size-8 rounded-md"
                      style={{ background: p.hue }}
                    />
                    <span className="truncate font-medium">{p.name}</span>
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="w-full border-t border-border py-2.5 text-sm font-semibold text-primary"
              onClick={() => setSearchOpen(false)}
            >
              Ver todos no catálogo
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
