import { ORDER_TYPE_STANDARD } from "@/features/orders/constants";
import type { Database } from "@/lib/supabase/types";

export type OrderStatus = Database["public"]["Enums"]["order_status"];
export type FulfillmentType = Database["public"]["Enums"]["fulfillment_type"];
export type PaymentStatus = Database["public"]["Enums"]["payment_status"];

/**
 * Writable order_type for new paths. DB enum still lists legacy `sacolinha`
 * for history; app code must never write it (#123 / D113).
 */
export type WritableOrderType = typeof ORDER_TYPE_STANDARD;

export type PublicOrderItem = {
  id: string;
  productName: string;
  productSlug: string | null;
  unitPrice: number;
  coverImageUrl: string | null;
  quantity: number;
  lineTotal: number;
};

export type PublicOrder = {
  publicCode: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentType: FulfillmentType;
  subtotalAmount: number;
  shippingAmount: number;
  totalAmount: number;
  estimatedFulfillment: string | null;
  trackingCode: string | null;
  createdAt: string;
  items: PublicOrderItem[];
};
