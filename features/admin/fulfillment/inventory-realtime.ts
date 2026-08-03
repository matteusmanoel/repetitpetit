/**
 * Helpers puros para Realtime de inventário (SN-14 / D47 extensão).
 * O provider aplica estes resultados; a publicação/RLS de `products` fica
 * a cargo do schema (SN-01/D47) — o handler não deve crashar com payload
 * parcial.
 */

export type ProductStatusRealtimeRow = {
  id?: string;
  status?: string | null;
};

/** Statuses que afetam cache POS / Passport em memória. */
const CACHEABLE_STATUSES = new Set(["hold", "available", "sold"]);

export function isProductStatusRealtimeRow(
  row: ProductStatusRealtimeRow | null | undefined,
): row is ProductStatusRealtimeRow & { id: string; status: string } {
  return Boolean(row?.id && row.status && CACHEABLE_STATUSES.has(row.status));
}

/**
 * Aplica mudança de `products.status` ao cache em memória.
 * - `sold`: remove (peça sai do inventário vendável)
 * - `hold` / `available`: atualiza
 */
export function applyProductStatusToCache(
  cache: Readonly<Record<string, string>>,
  row: ProductStatusRealtimeRow | null | undefined,
): Record<string, string> {
  if (!isProductStatusRealtimeRow(row)) {
    return { ...cache };
  }

  if (row.status === "sold") {
    const next = { ...cache };
    delete next[row.id];
    return next;
  }

  return { ...cache, [row.id]: row.status };
}

/** Hold Session events that should refresh dashboard KPIs. */
export function shouldRefreshDashboardForHoldEvent(status?: string | null): boolean {
  if (!status) return true;
  return (
    status === "active" ||
    status === "expired" ||
    status === "cancelled" ||
    status === "converted"
  );
}
