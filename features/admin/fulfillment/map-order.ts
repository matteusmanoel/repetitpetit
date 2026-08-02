import type { Database } from "@/lib/supabase/types";

import type {
  FulfillmentQueueItem,
  FulfillmentQueueOrder,
} from "@/features/admin/fulfillment/types";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];
type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];

type OrderWithRelations = Pick<
  OrderRow,
  | "id"
  | "public_code"
  | "status"
  | "fulfillment_type"
  | "total_amount"
  | "paid_at"
  | "created_at"
  | "tracking_code"
> & {
  customers: Pick<CustomerRow, "full_name" | "phone"> | null;
  order_items: Pick<
    OrderItemRow,
    | "id"
    | "product_name_snapshot"
    | "cover_image_snapshot"
    | "quantity"
    | "line_total"
  >[];
};

function mapItems(
  rows: OrderWithRelations["order_items"],
): FulfillmentQueueItem[] {
  return (rows ?? []).map((item) => ({
    id: item.id,
    productName: item.product_name_snapshot,
    coverImageUrl: item.cover_image_snapshot,
    quantity: item.quantity,
    lineTotal: Number(item.line_total),
  }));
}

/** Mapeia o join service-role → DTO da fila. */
export function mapFulfillmentQueueOrder(
  row: OrderWithRelations,
): FulfillmentQueueOrder {
  const items = mapItems(row.order_items);

  return {
    id: row.id,
    publicCode: row.public_code,
    status: row.status,
    fulfillmentType: row.fulfillment_type,
    totalAmount: Number(row.total_amount),
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    paidAt: row.paid_at,
    createdAt: row.created_at,
    trackingCode: row.tracking_code,
    customerName: row.customers?.full_name ?? null,
    customerPhone: row.customers?.phone ?? null,
    items,
  };
}
