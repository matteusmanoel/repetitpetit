/**
 * Helpers puros para Realtime hold↔available no catálogo/PDP (#98).
 */

export type CatalogRealtimeStatus = "available" | "hold" | string | null | undefined;

export function isHoldAvailableTransition(
  previous: CatalogRealtimeStatus,
  next: CatalogRealtimeStatus,
): boolean {
  if (!previous || !next || previous === next) return false;
  const relevant = new Set(["available", "hold"]);
  return relevant.has(previous) && relevant.has(next);
}

/** Toast PT-BR curto; null = sem toast (update silencioso). */
export function toastMessageForHoldAvailabilityChange(
  previous: CatalogRealtimeStatus,
  next: CatalogRealtimeStatus,
): string | null {
  if (!isHoldAvailableTransition(previous, next)) return null;
  if (previous === "hold" && next === "available") {
    return "Peça disponível de novo";
  }
  if (previous === "available" && next === "hold") {
    return "Peça reservada";
  }
  return null;
}

export type ProductStatusChangePayload = {
  id?: string;
  status?: string | null;
};

/**
 * Decide se um UPDATE de products deve atualizar catálogo/PDP.
 * Escopo enxuto: só hold↔available (e sold saindo da vitrine quando prev era hold/available).
 */
export function shouldRefreshCatalogForProductChange(
  previous: ProductStatusChangePayload | null | undefined,
  next: ProductStatusChangePayload | null | undefined,
): boolean {
  const prevStatus = previous?.status;
  const nextStatus = next?.status;
  if (!next?.id) return false;

  if (isHoldAvailableTransition(prevStatus, nextStatus)) {
    return true;
  }

  // Peça saiu da vitrine (ex.: sold) — refresh para sumir do grid.
  if (
    (prevStatus === "available" || prevStatus === "hold") &&
    nextStatus != null &&
    nextStatus !== "available" &&
    nextStatus !== "hold"
  ) {
    return true;
  }

  return false;
}
