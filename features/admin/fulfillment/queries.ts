import "server-only";

import { mapFulfillmentQueueOrder } from "@/features/admin/fulfillment/map-order";
import { sortQueueOrders } from "@/features/admin/fulfillment/queue-logic";
import { IN_PROGRESS_STATUSES } from "@/features/admin/fulfillment/transitions";
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
  tracking_code,
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

  // D105: entrega imediata acima de Sacolinha (SSR alinhado ao Realtime).
  return sortQueueOrders((data ?? []).map(mapFulfillmentQueueOrder));
}

/**
 * Pedidos em separação / envio (confirmed, ready_for_pickup, na_sacolinha, shipped).
 */
export async function getInProgressFulfillmentQueue(): Promise<
  FulfillmentQueueOrder[]
> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from("orders")
    .select(QUEUE_SELECT)
    .in("status", [...IN_PROGRESS_STATUSES])
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Falha ao carregar pedidos em andamento: ${error.message}`,
    );
  }

  return sortQueueOrders((data ?? []).map(mapFulfillmentQueueOrder));
}

/**
 * Um pedido pago por id — usado para enriquecer eventos Realtime da fila paid.
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

/**
 * Pedido por id em qualquer status de fila (paid ou em progresso).
 * Usado após transição / Realtime para atualizar cards.
 */
export async function getFulfillmentQueueOrderById(
  orderId: string,
): Promise<FulfillmentQueueOrder | null> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from("orders")
    .select(QUEUE_SELECT)
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao carregar pedido: ${error.message}`);
  }

  if (!data) return null;

  return mapFulfillmentQueueOrder(data);
}
