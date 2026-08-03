import type { Database } from "@/lib/supabase/types";

type ProductStatus = Database["public"]["Enums"]["product_status"];

/**
 * UI gate for POS sell flow (SN-08).
 * `pending_payment` / `paid` refer to online Order claims, not product enum values.
 */
export type PosSellGate =
  | "available"
  | "hold"
  | "pending_payment"
  | "sold_or_paid"
  | "inactive"
  | "blocked";

export function deriveSellGate(input: {
  status: ProductStatus | string;
  hasPendingOnlineOrder: boolean;
  hasPaidOrder: boolean;
}): PosSellGate {
  if (input.status === "sold" || input.hasPaidOrder) {
    return "sold_or_paid";
  }
  if (input.status === "inactive") {
    return "inactive";
  }
  if (input.hasPendingOnlineOrder) {
    return "pending_payment";
  }
  if (input.status === "hold") {
    return "hold";
  }
  if (input.status === "available") {
    return "available";
  }
  return "blocked";
}
