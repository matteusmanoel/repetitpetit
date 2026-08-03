/**
 * Mapeia o método de pagamento do POS (API / payment_provider) para
 * `orders.store_payment_method` (CHECK SN-01: cash | card | pix).
 */

export type StorePaymentMethodInput = "cash" | "card_local" | "pix_local";
export type StorePaymentMethodPersisted = "cash" | "card" | "pix";

export function toStorePaymentMethod(
  method: StorePaymentMethodInput,
): StorePaymentMethodPersisted {
  switch (method) {
    case "cash":
      return "cash";
    case "card_local":
      return "card";
    case "pix_local":
      return "pix";
  }
}

/** Status de inventário aceitos ao criar Order store (D62 / D71 — hold permitido). */
export function isStoreOrderEligibleStatus(status: string): boolean {
  return status === "available" || status === "hold";
}
