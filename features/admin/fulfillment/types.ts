import type { FulfillmentType, OrderStatus } from "@/features/orders/types";

/** Item resumido exibido no card / grade de Separação. */
export type FulfillmentQueueItem = {
  id: string;
  productName: string;
  coverImageUrl: string | null;
  quantity: number;
  lineTotal: number;
  unitPrice: number;
  /** Separação check (ADR 0002) — ISO timestamptz or null. */
  packedAt: string | null;
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
  /** Sacolinha: ready_since + 30d (D116) — usado pelo radar SP-5. */
  pickupDeadline: string | null;
  customerName: string | null;
  customerPhone: string | null;
  items: FulfillmentQueueItem[];
};
