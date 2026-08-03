import type { ProductStatus } from "@/features/admin/product-constants";
import type { ProductWithImages } from "@/features/admin/product-types";
import type { Database } from "@/lib/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

/** Active Hold Session projection for Passport status bar (D66). */
export type PassportHoldSession = {
  id: string;
  /** Browser cookie `rp_cart_session` value. */
  sessionId: string;
  expiresAt: string;
};

/** Latest paid Sale linked to this Peça (D65 / D68). */
export type PassportSale = {
  orderId: string;
  publicCode: string;
  channel: string;
  /** Prefer `paid_at`; fall back to `created_at`. */
  soldAt: string;
  status: OrderStatus;
};

export type PassportData = {
  product: ProductWithImages;
  hold: PassportHoldSession | null;
  sale: PassportSale | null;
};

export type PassportQuickActionId =
  | "sell"
  | "edit"
  | "archive"
  | "override"
  | "view_hold"
  | "view_sale"
  | "reprint"
  | "reactivate";

export type PassportQuickAction = {
  id: PassportQuickActionId;
  label: string;
  /** Visual weight — primary CTAs first. */
  variant: "default" | "outline" | "secondary" | "destructive";
};

/** Statuses the Passport UI treats as first-class (D67 / SN-11). */
export type PassportInventoryStatus = Extract<
  ProductStatus,
  "available" | "hold" | "sold" | "inactive"
>;
