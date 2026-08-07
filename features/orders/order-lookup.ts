import "server-only";

import type { PublicOrder } from "@/features/orders/types";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

const PUBLIC_CODE_RE = /^RP-\d{4}-\d{4}$/;

/**
 * Lê pedido público por `orders.public_code` (T18).
 * Service role — anon não tem SELECT em `orders`/`order_items` (D13).
 * Sem login: o código público é o único segredo de acesso.
 */
export async function getPublicOrder(
  publicCode: string,
): Promise<PublicOrder | null> {
  const code = publicCode.trim().toUpperCase();
  if (!PUBLIC_CODE_RE.test(code)) {
    return null;
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      public_code,
      status,
      payment_status,
      fulfillment_type,
      subtotal_amount,
      shipping_amount,
      total_amount,
      estimated_fulfillment,
      tracking_code,
      created_at,
      customers (
        email
      ),
      order_items (
        id,
        product_name_snapshot,
        product_slug_snapshot,
        unit_price_snapshot,
        cover_image_snapshot,
        quantity,
        line_total
      )
    `,
    )
    .eq("public_code", code)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const items = (data.order_items ?? []).map((item) => ({
    id: item.id,
    productName: item.product_name_snapshot,
    productSlug: item.product_slug_snapshot,
    unitPrice: Number(item.unit_price_snapshot),
    coverImageUrl: item.cover_image_snapshot,
    quantity: item.quantity,
    lineTotal: Number(item.line_total),
  }));

  const customerRelation = data.customers as
    | { email: string | null }
    | { email: string | null }[]
    | null;
  const customerEmail = Array.isArray(customerRelation)
    ? (customerRelation[0]?.email ?? null)
    : (customerRelation?.email ?? null);

  return {
    publicCode: data.public_code,
    status: data.status,
    paymentStatus: data.payment_status,
    fulfillmentType: data.fulfillment_type,
    subtotalAmount: Number(data.subtotal_amount),
    shippingAmount: Number(data.shipping_amount),
    totalAmount: Number(data.total_amount),
    estimatedFulfillment: data.estimated_fulfillment,
    trackingCode: data.tracking_code,
    createdAt: data.created_at,
    items,
    customerEmail,
  };
}
