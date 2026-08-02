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
 * Pedido na fila de fulfillment (paid ou em progresso).
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
  trackingCode: string | null;
  customerName: string | null;
  customerPhone: string | null;
  items: FulfillmentQueueItem[];
};
