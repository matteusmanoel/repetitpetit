import "server-only";

import {
  isSacolinhaPanelStatus,
  SACOLINHA_PANEL_STATUSES,
} from "@/features/buyer/constants";
import {
  getFulfillmentLabel,
  getOrderStatusLabel,
} from "@/features/orders/status";
import type {
  FulfillmentType,
  OrderStatus,
} from "@/features/orders/types";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

export type SacolinhaPanelItem = {
  orderItemId: string;
  publicCode: string;
  productName: string;
  productSlug: string | null;
  coverImageUrl: string | null;
  unitPrice: number;
  orderStatus: OrderStatus;
  orderStatusLabel: string;
  fulfillmentType: FulfillmentType;
  fulfillmentLabel: string;
  createdAt: string;
};

/**
 * Peças pagas aguardando retirada / em separação para o customer logado (SO-03).
 */
export async function listSacolinhaPanelItems(
  customerId: string,
): Promise<SacolinhaPanelItem[]> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      public_code,
      status,
      fulfillment_type,
      created_at,
      order_items (
        id,
        product_name_snapshot,
        product_slug_snapshot,
        unit_price_snapshot,
        cover_image_snapshot
      )
    `,
    )
    .eq("customer_id", customerId)
    .in("status", [...SACOLINHA_PANEL_STATUSES])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Falha ao listar Sacolinha do comprador:", error);
    return [];
  }

  const items: SacolinhaPanelItem[] = [];

  for (const order of data ?? []) {
    if (!isSacolinhaPanelStatus(order.status)) continue;
    for (const row of order.order_items ?? []) {
      items.push({
        orderItemId: row.id,
        publicCode: order.public_code,
        productName: row.product_name_snapshot,
        productSlug: row.product_slug_snapshot,
        coverImageUrl: row.cover_image_snapshot,
        unitPrice: Number(row.unit_price_snapshot),
        orderStatus: order.status,
        orderStatusLabel: getOrderStatusLabel(order.status),
        fulfillmentType: order.fulfillment_type,
        fulfillmentLabel: getFulfillmentLabel(order.fulfillment_type),
        createdAt: order.created_at,
      });
    }
  }

  return items;
}
