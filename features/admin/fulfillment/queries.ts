import "server-only";

import { mapFulfillmentQueueOrder } from "@/features/admin/fulfillment/map-order";
import type { FulfillmentQueueOrder } from "@/features/admin/fulfillment/types";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

const QUEUE_SELECT = `
  id,
  public_code,
  status,
  fulfillment_type,
  total_amount,
  paid_at,
  created_at,
  customers (
    full_name,
    phone
  ),
  order_items (
    id,
    product_name_snapshot,
    cover_image_snapshot,
    quantity,
    line_total
  )
`;

/**
 * Pedidos `paid` existentes para a fila (SSR / mount).
 * Service role — D13; o layout `(protected)` já garante sessão admin.
 */
export async function getPaidFulfillmentQueue(): Promise<
  FulfillmentQueueOrder[]
> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from("orders")
    .select(QUEUE_SELECT)
    .eq("status", "paid")
    .order("paid_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Falha ao carregar fila de fulfillment: ${error.message}`,
    );
  }

  return (data ?? []).map(mapFulfillmentQueueOrder);
}

/**
 * Um pedido pago por id — usado para enriquecer eventos Realtime (só a row
 * de `orders` chega pelo canal; itens/cliente vêm daqui).
 */
export async function getPaidFulfillmentQueueOrderById(
  orderId: string,
): Promise<FulfillmentQueueOrder | null> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from("orders")
    .select(QUEUE_SELECT)
    .eq("id", orderId)
    .eq("status", "paid")
    .maybeSingle();

  if (error) {
    throw new Error(
      `Falha ao carregar pedido da fila: ${error.message}`,
    );
  }

  if (!data) return null;

  return mapFulfillmentQueueOrder(data);
}
