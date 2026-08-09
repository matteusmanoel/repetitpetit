"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import {
  serializeCatalogFilters,
  parseCatalogFilters,
  type CatalogFilters,
} from "./filters";

/**
 * Lê filtros da URL e atualiza via `router.replace` (soft navigation, sem reload).
 * Preserva `q`; reseta `page` ao mudar filtros (evita página vazia).
 */
export function useCatalogFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const filters = parseCatalogFilters(searchParams);

  function replaceFilters(next: CatalogFilters) {
    const params = serializeCatalogFilters(next);
    const q = searchParams.get("q")?.trim();
    if (q) {
      params.set("q", q);
    }
    // page omitido de propósito — volta à página 1
    const qs = params.toString();
    const href = qs ? `${pathname}?${qs}` : pathname;
    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }

  return { filters, replaceFilters, isPending };
}
