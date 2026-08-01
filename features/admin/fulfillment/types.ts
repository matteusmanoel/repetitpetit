import type { FulfillmentType, OrderStatus } from "@/features/orders/types";

/** Item resumido exibido no card da fila de fulfillment. */
export type FulfillmentQueueItem = {
  id: string;
  productName: string;
  coverImageUrl: string | null;
  quantity: number;
  lineTotal: number;
};

/**
 * Pedido `paid` na fila do lojista (T19).
 * Transições de status (confirmed/shipped/…) ficam para T20/#21.
 */
export type FulfillmentQueueOrder = {
  id: string;
  publicCode: string;
  status: OrderStatus;
  fulfillmentType: FulfillmentType;
  totalAmount: number;
  itemCount: number;
  paidAt: string | null;
  createdAt: string;
  customerName: string | null;
  customerPhone: string | null;
  items: FulfillmentQueueItem[];
};
