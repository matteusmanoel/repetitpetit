import "server-only";

import {
  BUYER_HISTORY_STATUSES,
  isBuyerHistoryStatus,
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

export type BuyerOrderSummary = {
  publicCode: string;
  status: OrderStatus;
  statusLabel: string;
  fulfillmentType: FulfillmentType;
  fulfillmentLabel: string;
  itemCount: number;
  totalAmount: number;
  createdAt: string;
  section: "active" | "history";
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

/**
 * Pedidos do comprador — ativos (Sacolinha) + histórico recente (SS-6).
 */
export async function listBuyerOrderSummaries(
  customerId: string,
): Promise<BuyerOrderSummary[]> {
  const supabase = createServiceSupabaseClient();
  const statuses = [
    ...SACOLINHA_PANEL_STATUSES,
    ...BUYER_HISTORY_STATUSES,
  ];

  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      public_code,
      status,
      fulfillment_type,
      total_amount,
      created_at,
      order_items ( id )
    `,
    )
    .eq("customer_id", customerId)
    .in("status", statuses)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    console.error("Falha ao listar pedidos do comprador:", error);
    return [];
  }

  return (data ?? []).map((order) => {
    const status = order.status as OrderStatus;
    return {
      publicCode: order.public_code,
      status,
      statusLabel: getOrderStatusLabel(status),
      fulfillmentType: order.fulfillment_type,
      fulfillmentLabel: getFulfillmentLabel(order.fulfillment_type),
      itemCount: order.order_items?.length ?? 0,
      totalAmount: Number(order.total_amount),
      createdAt: order.created_at,
      section: isBuyerHistoryStatus(status) ? "history" : "active",
    };
  });
}
