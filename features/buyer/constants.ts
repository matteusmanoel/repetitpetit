import type { OrderStatus } from "@/features/orders/types";

/**
 * Statuses shown in the buyer Sacolinha panel — paid / packing / awaiting pickup
 * (D105 / SO-03). Excludes pending_payment, completed, shipped, cancelled, expired.
 */
export const SACOLINHA_PANEL_STATUSES = [
  "paid",
  "confirmed",
  "ready_for_pickup",
  "na_sacolinha",
] as const satisfies readonly OrderStatus[];

export type SacolinhaPanelStatus = (typeof SACOLINHA_PANEL_STATUSES)[number];

export function isSacolinhaPanelStatus(
  status: OrderStatus,
): status is SacolinhaPanelStatus {
  return (SACOLINHA_PANEL_STATUSES as readonly string[]).includes(status);
}

/** Default post-login landing for magic-link callback. */
export const BUYER_DEFAULT_NEXT_PATH = "/sacolinha";

/** Safe relative next paths only (open-redirect guard). */
export function sanitizeBuyerNextPath(raw: string | null | undefined): string {
  if (!raw) return BUYER_DEFAULT_NEXT_PATH;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return BUYER_DEFAULT_NEXT_PATH;
  }
  if (trimmed.startsWith("/admin") || trimmed.startsWith("/api")) {
    return BUYER_DEFAULT_NEXT_PATH;
  }
  return trimmed;
}
