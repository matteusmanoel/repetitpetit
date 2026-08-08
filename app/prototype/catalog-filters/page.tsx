"use client";

/**
 * PROTOTYPE — Catalog filters + search (Slice R).
 * Question: how should “always-on” filters + drawer + search autocomplete compose?
 * Variants: A Faixa · B Sticky slim · C Chips+sheet. Do not promote.
 */

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import {
  PrototypeSwitcher,
  type PrototypeVariantMeta,
} from "@/components/prototype/PrototypeSwitcher";

import { CatalogFiltersPrototypeProvider, useCatalogFiltersPrototype } from "./prototype-state";
import { VariantA, VariantB, VariantC } from "./variants";

const VARIANTS: PrototypeVariantMeta[] = [
  { key: "A", label: "Faixa horizontal" },
  { key: "B", label: "Sticky slim" },
  { key: "C", label: "Chips + sheet" },
];

function PrototypeInner() {
  const searchParams = useSearchParams();
  const variant = (searchParams.get("variant") ?? "A").toUpperCase();
  const { filters, query, filtered, searchOpen } = useCatalogFiltersPrototype();

  return (
    <div className="font-sans antialiased">
      {variant === "B" ? <VariantB /> : null}
      {variant === "C" ? <VariantC /> : null}
      {variant !== "B" && variant !== "C" ? <VariantA /> : null}
      <PrototypeSwitcher variants={VARIANTS} />
      <pre className="pointer-events-none fixed left-2 top-2 z-[90] max-w-[14rem] overflow-auto rounded-lg bg-black/80 p-2 font-mono text-[9px] text-lime-300">
        {JSON.stringify(
          {
            variant,
            query,
            searchOpen,
            gender: filters.gender,
            age: filters.age,
            sizes: filters.sizes,
            price: [filters.priceMin, filters.priceMax],
            results: filtered.length,
          },
          null,
          0,
        )}
      </pre>
    </div>
  );
}

export default function CatalogFiltersPrototypePage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 font-sans text-sm">Carregando protótipo…</div>
      }
    >
      <CatalogFiltersPrototypeProvider>
        <PrototypeInner />
      </CatalogFiltersPrototypeProvider>
    </Suspense>
  );
}
