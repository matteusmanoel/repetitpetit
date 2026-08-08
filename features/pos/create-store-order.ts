"use server";

import { requireAdminSession } from "@/features/admin/session";
import { nextPublicCode } from "@/features/checkout/public-code";
import {
  isStoreOrderEligibleStatus,
  toStorePaymentMethod,
} from "@/features/pos/payment-method";
import { createStoreOrderSchema } from "@/features/pos/schemas";
import type { CreateStoreOrderResult } from "@/features/pos/types";
import { ORDER_TYPE_STANDARD } from "@/features/orders/constants";
import type { Json } from "@/lib/supabase/types";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

/**
 * Cria Order de balcão (`channel = store`) em `pending_payment`.
 * Não altera `products.status` — sold só em `confirmStoreSaleAction` (D71).
 */
export async function createStoreOrderAction(
  raw: unknown,
): Promise<CreateStoreOrderResult> {
  await requireAdminSession();

  const parsed = createStoreOrderSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      code: "validation",
    };
  }

  const data = parsed.data;
  const uniqueProductIds = [...new Set(data.productIds)];
  const supabase = createServiceSupabaseClient();

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name, slug, price, cover_image_url, status, quantity")
    .in("id", uniqueProductIds);

  if (productsError) {
    console.error("createStoreOrderAction products:", productsError);
    return {
      ok: false,
      error: "Não foi possível carregar as peças. Tente novamente.",
      code: "db",
    };
  }

  if (!products || products.length !== uniqueProductIds.length) {
    return {
      ok: false,
      error: "Uma ou mais peças não foram encontradas.",
      code: "unavailable",
    };
  }

  for (const product of products) {
    if (!isStoreOrderEligibleStatus(product.status)) {
      return {
        ok: false,
        error: `A peça "${product.name}" não está disponível para venda no balcão.`,
        code: "unavailable",
      };
    }
    if (product.quantity < 1) {
      return {
        ok: false,
        error: `A peça "${product.name}" esgotou.`,
        code: "unavailable",
      };
    }
  }

  const productById = new Map(products.map((p) => [p.id, p]));
  const lines = uniqueProductIds.map((productId) => {
    const product = productById.get(productId)!;
    const unitPrice = Number(product.price);
    return {
      productId: product.id,
      name: product.name,
      slug: product.slug,
      coverImageUrl: product.cover_image_url,
      unitPrice,
      quantity: 1 as const,
      lineTotal: unitPrice,
    };
  });

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const total = subtotal;
  const storePaymentMethod = toStorePaymentMethod(data.paymentMethod);

  const year = new Date().getFullYear();
  const { data: latestOrder } = await supabase
    .from("orders")
    .select("public_code")
    .like("public_code", `RP-${year}-%`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let publicCode = nextPublicCode(latestOrder?.public_code ?? null, year);
  let orderId: string | null = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const pricingSnapshot: Json = {
      channel: "store",
      lines: lines.map((line) => ({
        product_id: line.productId,
        name: line.name,
        unit_price: line.unitPrice,
        quantity: line.quantity,
        line_total: line.lineTotal,
      })),
      subtotal,
      shipping_amount: 0,
      total,
      store_payment_method: storePaymentMethod,
      payment_method_input: data.paymentMethod,
      staff_id: data.staffId,
    };

    const { data: orderRow, error: orderError } = await supabase
      .from("orders")
      .insert({
        public_code: publicCode,
        customer_id: data.customerId ?? null,
        order_type: ORDER_TYPE_STANDARD,
        status: "pending_payment",
        payment_status: "pending",
        channel: "store",
        fulfillment_type: "store_counter",
        store_payment_method: storePaymentMethod,
        shipping_rule_id: null,
        shipping_amount: 0,
        subtotal_amount: subtotal,
        discount_amount: 0,
        total_amount: total,
        customer_note: data.customerNote?.trim() || null,
        pricing_snapshot_json: pricingSnapshot,
        address_snapshot_json: null,
      })
      .select("id, public_code")
      .single();

    if (!orderError && orderRow) {
      orderId = orderRow.id;
      publicCode = orderRow.public_code;
      break;
    }

    if (orderError?.code === "23505") {
      publicCode = nextPublicCode(publicCode, year);
      continue;
    }

    console.error("createStoreOrderAction order:", orderError);
    return {
      ok: false,
      error: "Não foi possível criar o pedido de balcão. Tente novamente.",
      code: "db",
    };
  }

  if (!orderId) {
    return {
      ok: false,
      error: "Não foi possível gerar o código do pedido. Tente novamente.",
      code: "db",
    };
  }

  const { error: itemsError } = await supabase.from("order_items").insert(
    lines.map((line) => ({
      order_id: orderId!,
      product_id: line.productId,
      product_name_snapshot: line.name,
      product_slug_snapshot: line.slug,
      unit_price_snapshot: line.unitPrice,
      cover_image_snapshot: line.coverImageUrl,
      quantity: 1,
      line_total: line.lineTotal,
    })),
  );

  if (itemsError) {
    console.error("createStoreOrderAction order_items:", itemsError);
    await supabase.from("orders").delete().eq("id", orderId);
    return {
      ok: false,
      error: "Não foi possível registrar as peças do pedido. Tente novamente.",
      code: "db",
    };
  }

  // D71: create ≠ sold — products.status permanece available|hold.
  return { ok: true, orderId, publicCode };
}
