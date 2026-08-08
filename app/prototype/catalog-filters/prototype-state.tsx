"use client";

/**
 * PROTOTYPE state — in-memory filters + search. Throwaway.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  AGE_LABELS,
  GENDER_LABELS,
  PRICE_MAX,
  PRICE_MIN,
  PROTO_BRANDS,
  PROTO_PRODUCTS,
  type ProtoAge,
  type ProtoGender,
  type ProtoProduct,
  type ProtoSize,
} from "./mock-data";

export type ProtoFilters = {
  gender: ProtoGender | null;
  age: ProtoAge | null;
  sizes: ProtoSize[];
  soDisponiveis: boolean;
  priceMin: number;
  priceMax: number;
  brands: string[];
  conditions: Array<"novo" | "seminovo" | "bom_estado">;
};

const EMPTY: ProtoFilters = {
  gender: null,
  age: null,
  sizes: [],
  soDisponiveis: false,
  priceMin: PRICE_MIN,
  priceMax: PRICE_MAX,
  brands: [],
  conditions: [],
};

type Ctx = {
  filters: ProtoFilters;
  setFilters: (next: ProtoFilters) => void;
  patch: (partial: Partial<ProtoFilters>) => void;
  query: string;
  setQuery: (q: string) => void;
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
  filtered: ProtoProduct[];
  suggestions: ProtoProduct[];
  activeChipLabels: string[];
  clearAll: () => void;
};

const ProtoCtx = createContext<Ctx | null>(null);

export function CatalogFiltersPrototypeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [filters, setFilters] = useState<ProtoFilters>(EMPTY);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const patch = useCallback((partial: Partial<ProtoFilters>) => {
    setFilters((prev) => {
      const next = { ...prev, ...partial };
      if (partial.gender !== undefined && partial.gender !== prev.gender) {
        next.age = null;
      }
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    return PROTO_PRODUCTS.filter((p) => {
      if (filters.gender && p.gender !== filters.gender) return false;
      if (filters.age && p.age !== filters.age) return false;
      if (filters.sizes.length && !filters.sizes.includes(p.size)) return false;
      if (filters.soDisponiveis && !p.available) return false;
      if (p.price < filters.priceMin || p.price > filters.priceMax) return false;
      if (filters.brands.length && !filters.brands.includes(p.brand)) return false;
      if (
        filters.conditions.length &&
        !filters.conditions.includes(p.condition)
      ) {
        return false;
      }
      const q = query.trim().toLowerCase();
      if (q) {
        const hay = `${p.name} ${p.brand} ${p.size}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [filters, query]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 1) return PROTO_PRODUCTS.slice(0, 4);
    return PROTO_PRODUCTS.filter((p) =>
      `${p.name} ${p.brand} ${p.size}`.toLowerCase().includes(q),
    ).slice(0, 8);
  }, [query]);

  const activeChipLabels = useMemo(() => {
    const labels: string[] = [];
    if (filters.gender) labels.push(GENDER_LABELS[filters.gender]);
    if (filters.age) labels.push(AGE_LABELS[filters.age]);
    for (const s of filters.sizes) labels.push(s);
    if (filters.soDisponiveis) labels.push("Só disponíveis");
    if (filters.priceMin > PRICE_MIN || filters.priceMax < PRICE_MAX) {
      labels.push(`R$ ${filters.priceMin}–${filters.priceMax}`);
    }
    for (const b of filters.brands) labels.push(b);
    for (const c of filters.conditions) labels.push(c);
    return labels;
  }, [filters]);

  const clearAll = useCallback(() => {
    setFilters(EMPTY);
    setQuery("");
  }, []);

  const value: Ctx = {
    filters,
    setFilters,
    patch,
    query,
    setQuery,
    searchOpen,
    setSearchOpen,
    filtered,
    suggestions,
    activeChipLabels,
    clearAll,
  };

  return <ProtoCtx.Provider value={value}>{children}</ProtoCtx.Provider>;
}

export function useCatalogFiltersPrototype() {
  const ctx = useContext(ProtoCtx);
  if (!ctx) {
    throw new Error("useCatalogFiltersPrototype outside provider");
  }
  return ctx;
}

export { PROTO_BRANDS, EMPTY as EMPTY_PROTO_FILTERS };
