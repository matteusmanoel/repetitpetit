import type { Database } from "@/lib/supabase/types";

type ProductStatus = Database["public"]["Enums"]["product_status"];

/**
 * When the Override control should appear (POS / Passport).
 * Visible for hold projection or a pending online payment claim.
 */
export function isOverrideActionVisible(input: {
  productStatus: ProductStatus | string;
  hasPendingOnlineOrder?: boolean;
}): boolean {
  return (
    input.productStatus === "hold" || input.hasPendingOnlineOrder === true
  );
}
