"use server";

import { getPaidFulfillmentQueueOrderById } from "@/features/admin/fulfillment/queries";
import type { FulfillmentQueueOrder } from "@/features/admin/fulfillment/types";
import { requireAdminSession } from "@/features/admin/session";

/**
 * Enriquecimento pós-Realtime: o canal entrega a row de `orders`; itens e
 * cliente vêm via service role (D13). Exige sessão admin.
 */
export async function fetchFulfillmentQueueOrderAction(
  orderId: string,
): Promise<FulfillmentQueueOrder | null> {
  await requireAdminSession();

  if (!orderId || typeof orderId !== "string") {
    return null;
  }

  return getPaidFulfillmentQueueOrderById(orderId);
}
