"use server";

import { peekCartSessionId } from "@/features/cart/session";
import { nextPublicCode } from "@/features/checkout/public-code";
import { createOrderSchema } from "@/features/checkout/schemas";
import type { CreateOrderResult } from "@/features/checkout/types";
import type { Json } from "@/lib/supabase/types";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

function normalizeCity(city: string): string {
  return city
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * Cria pedido `pending_payment` a partir do carrinho reservado (T15 / D13).
 *
 * - Recalcula preços a partir de `products` (nunca confia no client).
 * - Valida reservas ativas da sessão (`cart_reservations`).
 * - Reusa `customers` por telefone.
 * - NÃO cria preferência Mercado Pago (ticket #17).
 */
export async function createOrderAction(
  raw: unknown,
): Promise<CreateOrderResult> {
  const parsed = createOrderSchema.safeParse(raw);

  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Dados inválidos.";
    return { success: false, error: first, code: "validation" };
  }

  const data = parsed.data;
  const sessionId = await peekCartSessionId();

  if (!sessionId) {
    return {
      success: false,
      error:
        "Sua sessão de carrinho expirou. Adicione as peças novamente ao carrinho.",
      code: "reservation_expired",
    };
  }

  const uniqueProductIds = [...new Set(data.productIds)];
  const supabase = createServiceSupabaseClient();
  const nowIso = new Date().toISOString();

  const { data: reservations, error: reservationError } = await supabase
    .from("cart_reservations")
    .select("id, product_id, expires_at")
    .eq("session_id", sessionId)
    .in("product_id", uniqueProductIds)
    .gt("expires_at", nowIso);

  if (reservationError) {
    console.error("Falha ao validar reservas:", reservationError);
    return {
      success: false,
      error: "Não foi possível validar suas reservas. Tente novamente.",
    };
  }

  const reservedIds = new Set(
    (reservations ?? []).map((row) => row.product_id),
  );

  if (reservedIds.size !== uniqueProductIds.length) {
    return {
      success: false,
      error:
        "Uma ou mais peças do carrinho não estão mais reservadas. Atualize o carrinho e tente de novo.",
      code: "reservation_expired",
    };
  }

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name, slug, price, cover_image_url, status, quantity")
    .in("id", uniqueProductIds);

  if (productsError || !products || products.length !== uniqueProductIds.length) {
    console.error("Falha ao carregar produtos do checkout:", productsError);
    return {
      success: false,
      error: "Não foi possível carregar as peças do pedido. Tente novamente.",
    };
  }

  for (const product of products) {
    // Reserva vive em cart_reservations; products.status permanece available (D40).
    if (product.status !== "available") {
      return {
        success: false,
        error: `A peça "${product.name}" não está mais disponível.`,
        code: "reservation_expired",
      };
    }
    if (product.quantity < 1) {
      return {
        success: false,
        error: `A peça "${product.name}" esgotou.`,
        code: "reservation_expired",
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

  const { data: shippingRules, error: shippingError } = await supabase
    .from("shipping_rules")
    .select("id, name, amount, description, metadata_json, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (shippingError || !shippingRules) {
    console.error("Falha ao carregar shipping_rules:", shippingError);
    return {
      success: false,
      error: "Não foi possível calcular o frete. Tente novamente.",
      code: "shipping",
    };
  }

  let shippingRuleId: string | null = null;
  let shippingAmount = 0;
  let estimatedFulfillment: string | null = null;

  if (data.fulfillmentType === "pickup") {
    const pickupRule =
      shippingRules.find((r) => {
        const meta = r.metadata_json;
        return (
          meta &&
          typeof meta === "object" &&
          !Array.isArray(meta) &&
          (meta as { type?: string }).type === "pickup"
        );
      }) ?? shippingRules.find((r) => Number(r.amount) === 0);

    shippingRuleId = pickupRule?.id ?? null;
    shippingAmount = 0;
    estimatedFulfillment =
      pickupRule?.description ?? "Retire em até 4h úteis";
  } else {
    const deliveryRule = shippingRules.find((r) => {
      const meta = r.metadata_json;
      if (!meta || typeof meta !== "object" || Array.isArray(meta)) return false;
      const cities = (meta as { cities?: unknown }).cities;
      return Array.isArray(cities) && cities.length > 0;
    });

    if (!deliveryRule) {
      return {
        success: false,
        error: "Entrega não está disponível no momento.",
        code: "shipping",
      };
    }

    const meta = deliveryRule.metadata_json as {
      cities?: string[];
      state?: string;
    };
    const allowedCities = (meta.cities ?? []).map(normalizeCity);
    const addressCity = normalizeCity(data.address!.city);

    if (
      allowedCities.length > 0 &&
      !allowedCities.includes(addressCity)
    ) {
      return {
        success: false,
        error: `Entrega disponível apenas para ${meta.cities?.join(", ") ?? "Foz do Iguaçu"}.`,
        code: "shipping",
      };
    }

    if (
      meta.state &&
      data.address!.state.toUpperCase() !== meta.state.toUpperCase()
    ) {
      return {
        success: false,
        error: `Entrega disponível apenas para o estado ${meta.state}.`,
        code: "shipping",
      };
    }

    shippingRuleId = deliveryRule.id;
    shippingAmount = Number(deliveryRule.amount);
    estimatedFulfillment =
      deliveryRule.description ?? "Entrega em até 24h úteis";
  }

  const total = subtotal + shippingAmount;

  // ── customer: reuse by phone ────────────────────────────────────────────
  const { data: existingCustomer, error: customerLookupError } = await supabase
    .from("customers")
    .select("id")
    .eq("phone", data.phone)
    .maybeSingle();

  if (customerLookupError) {
    console.error("Falha ao buscar customer:", customerLookupError);
    return {
      success: false,
      error: "Não foi possível salvar seus dados. Tente novamente.",
    };
  }

  let customerId: string;

  if (existingCustomer) {
    customerId = existingCustomer.id;
    const { error: updateError } = await supabase
      .from("customers")
      .update({
        full_name: data.fullName,
        email: data.email ?? null,
        updated_at: nowIso,
      })
      .eq("id", customerId);

    if (updateError) {
      console.error("Falha ao atualizar customer:", updateError);
      return {
        success: false,
        error: "Não foi possível salvar seus dados. Tente novamente.",
      };
    }
  } else {
    const { data: createdCustomer, error: createCustomerError } = await supabase
      .from("customers")
      .insert({
        full_name: data.fullName,
        phone: data.phone,
        email: data.email ?? null,
      })
      .select("id")
      .single();

    if (createCustomerError || !createdCustomer) {
      console.error("Falha ao criar customer:", createCustomerError);
      return {
        success: false,
        error: "Não foi possível salvar seus dados. Tente novamente.",
      };
    }

    customerId = createdCustomer.id;
  }

  // ── address (delivery only) ─────────────────────────────────────────────
  let addressSnapshot: Json | null = null;

  if (data.fulfillmentType === "delivery" && data.address) {
    const addr = data.address;
    const { error: addressError } = await supabase.from("addresses").insert({
      customer_id: customerId,
      recipient_name: addr.recipientName,
      street: addr.street,
      number: addr.number,
      complement: addr.complement ?? null,
      neighborhood: addr.neighborhood,
      city: addr.city,
      state: addr.state,
      postal_code: addr.postalCode,
      reference: addr.reference ?? null,
    });

    if (addressError) {
      console.error("Falha ao criar address:", addressError);
      return {
        success: false,
        error: "Não foi possível salvar o endereço. Tente novamente.",
      };
    }

    addressSnapshot = {
      recipient_name: addr.recipientName,
      street: addr.street,
      number: addr.number,
      complement: addr.complement ?? null,
      neighborhood: addr.neighborhood,
      city: addr.city,
      state: addr.state,
      postal_code: addr.postalCode,
      reference: addr.reference ?? null,
    };
  }

  // ── public_code + order ─────────────────────────────────────────────────
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
      lines: lines.map((line) => ({
        product_id: line.productId,
        name: line.name,
        unit_price: line.unitPrice,
        quantity: line.quantity,
        line_total: line.lineTotal,
      })),
      subtotal,
      shipping_amount: shippingAmount,
      total,
    };

    const { data: orderRow, error: orderError } = await supabase
      .from("orders")
      .insert({
        public_code: publicCode,
        customer_id: customerId,
        order_type: "standard",
        status: "pending_payment",
        payment_status: "pending",
        fulfillment_type: data.fulfillmentType,
        shipping_rule_id: shippingRuleId,
        shipping_amount: shippingAmount,
        subtotal_amount: subtotal,
        discount_amount: 0,
        total_amount: total,
        address_snapshot_json: addressSnapshot,
        pricing_snapshot_json: pricingSnapshot,
        estimated_fulfillment: estimatedFulfillment,
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

    console.error("Falha ao criar order:", orderError);
    return {
      success: false,
      error: "Não foi possível criar o pedido. Tente novamente.",
    };
  }

  if (!orderId) {
    return {
      success: false,
      error: "Não foi possível gerar o código do pedido. Tente novamente.",
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
    console.error("Falha ao criar order_items:", itemsError);
    await supabase.from("orders").delete().eq("id", orderId);
    return {
      success: false,
      error: "Não foi possível registrar as peças do pedido. Tente novamente.",
    };
  }

  return {
    success: true,
    publicCode,
    orderId,
  };
}
