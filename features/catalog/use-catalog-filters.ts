"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import {
  catalogFiltersToQueryString,
  parseCatalogFilters,
  type CatalogFilters,
} from "./filters";

/**
 * Lê filtros da URL e atualiza via `router.replace` (soft navigation, sem reload).
 */
export function useCatalogFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const filters = parseCatalogFilters(searchParams);

  function replaceFilters(next: CatalogFilters) {
    const qs = catalogFiltersToQueryString(next);
    const href = qs ? `${pathname}?${qs}` : pathname;
    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }

  return { filters, replaceFilters, isPending };
}
