import type { FulfillmentType } from "@/features/checkout/types";

/**
 * P0 (D102 / #124): pagamento só no path Sacolinha (`pickup`).
 * Entrega imediata fica selecionável como stub até frete haversine (#127 / D104).
 */
export function isCheckoutPayEnabled(
  fulfillmentType: FulfillmentType | "",
  options?: { deliveryFreteReady?: boolean },
): boolean {
  if (fulfillmentType === "pickup") return true;
  if (fulfillmentType === "delivery") {
    return options?.deliveryFreteReady === true;
  }
  return false;
}
