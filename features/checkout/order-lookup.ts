import "server-only";

import { getPublicOrder } from "@/features/orders/order-lookup";
import type { PublicOrder } from "@/features/orders/types";

/**
 * @deprecated Prefer `getPublicOrder` de `@/features/orders` (T18).
 * Mantido para compatibilidade com o redirect pós-checkout (T15 / D43).
 */
export type PublicOrderStub = {
  publicCode: string;
  status: string;
  paymentStatus: string;
  fulfillmentType: string;
  totalAmount: number;
  estimatedFulfillment: string | null;
  createdAt: string;
};

/**
 * Stub mínimo pós-checkout — delega à leitura completa por `public_code`.
 */
export async function getPublicOrderStub(
  publicCode: string,
): Promise<PublicOrderStub | null> {
  const order = await getPublicOrder(publicCode);
  if (!order) return null;
  return toStub(order);
}

function toStub(order: PublicOrder): PublicOrderStub {
  return {
    publicCode: order.publicCode,
    status: order.status,
    paymentStatus: order.paymentStatus,
    fulfillmentType: order.fulfillmentType,
    totalAmount: order.totalAmount,
    estimatedFulfillment: order.estimatedFulfillment,
    createdAt: order.createdAt,
  };
}
