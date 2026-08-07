import type { FulfillmentType } from "@/features/checkout/types";

/**
 * D102 / D104 (#127): Sacolinha sempre paga; entrega só com frete
 * haversine calculado e dentro do raio (`deliveryFreteReady`).
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
