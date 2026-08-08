"use server";

import {
  convertHoldSession,
  getHoldSession,
} from "@/features/cart/hold-session";
import { peekCartSessionId } from "@/features/cart/session";
import { resolveDeliveryFreteForOrder } from "@/features/checkout/calculate-frete";
import { nextPublicCode } from "@/features/checkout/public-code";
import { planCustomerResolve } from "@/features/checkout/resolve-customer";
import { createOrderSchema } from "@/features/checkout/schemas";
import type { CreateOrderResult } from "@/features/checkout/types";
import {
  interpretConvertHoldResult,
  planHoldCheckoutGate,
} from "@/features/checkout/validate-hold";
import {
  ORDER_TYPE_STANDARD,
  PENDING_PAYMENT_TTL_MINUTES,
} from "@/features/orders/constants";
import { createCheckoutPreferenceForOrder } from "@/features/payments/create-checkout-preference";
import type { Json } from "@/lib/supabase/types";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";


/**
 * Cria pedido `pending_payment` a partir da Hold Session (SN-04 / D61 / D66)
 * e inicia Checkout Pro (T16 / D08) com preferência a partir de `order_items`.
 *
 * - Valida Hold Session ativa + cookie da mesma sessão.
 * - Deriva `order_items` de `hold_items` + `products.price` (nunca confia no client).
 * - Após criar o pedido: `convert_hold_session` (produtos permanecem `hold` — não sold).
 * - Reusa `customers` por e-mail, depois telefone (SN-12 / D69).
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
  const browserSessionId = await peekCartSessionId();
  let snapshot: Awaited<ReturnType<typeof getHoldSession>> = null;

  try {
    if (browserSessionId) {
      snapshot = await getHoldSession(browserSessionId);
    }
  } catch (error) {
    console.error("Falha ao carregar Hold Session no checkout:", error);
    return {
      success: false,
      error: "Não foi possível validar sua reserva. Tente novamente.",
    };
  }

  const gate = planHoldCheckoutGate({
    holdSessionId: data.holdSessionId,
    browserSessionId,
    snapshot,
  });

  if (!gate.ok) {
    return {
      success: false,
      error: gate.error,
      code: gate.code,
    };
  }

  const uniqueProductIds = gate.productIds;
  const supabase = createServiceSupabaseClient();
  const nowIso = new Date().toISOString();

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
    // Hold Session: projeção `hold` até pagamento (D66 / SN-02).
    if (product.status !== "hold") {
      return {
        success: false,
        error: `A peça "${product.name}" não está mais reservada.`,
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
  let freteSnapshot: Json | null = null;

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
    // D104: frete haversine recalculado no server — nunca confiar no client.
    if (!data.address) {
      return {
        success: false,
        error: "Preencha o endereço de entrega.",
        code: "validation",
      };
    }

    const frete = await resolveDeliveryFreteForOrder(data.address.postalCode);
    if (!frete.ok) {
      return {
        success: false,
        error: frete.error,
        code: frete.code,
      };
    }

    const deliveryRule = shippingRules.find((r) => {
      const meta = r.metadata_json;
      if (!meta || typeof meta !== "object" || Array.isArray(meta)) return false;
      const typed = meta as { type?: string; cities?: unknown };
      if (typed.type === "delivery" || typed.type === "haversine") return true;
      return Array.isArray(typed.cities) && typed.cities.length > 0;
    });

    shippingRuleId = deliveryRule?.id ?? null;
    shippingAmount = frete.amount;
    estimatedFulfillment = frete.estimatedFulfillment;
    freteSnapshot = frete.snapshot as Json;
  }

  const total = subtotal + shippingAmount;

  // ── customer: email first, then phone (SN-12); always linked on online orders ─
  const [emailLookup, phoneLookup] = await Promise.all([
    supabase
      .from("customers")
      .select("id, full_name, phone, email")
      .eq("email", data.email)
      .maybeSingle(),
    supabase
      .from("customers")
      .select("id, full_name, phone, email")
      .eq("phone", data.phone)
      .maybeSingle(),
  ]);

  if (emailLookup.error || phoneLookup.error) {
    console.error("Falha ao buscar customer:", emailLookup.error ?? phoneLookup.error);
    return {
      success: false,
      error: "Não foi possível salvar seus dados. Tente novamente.",
    };
  }

  const plan = planCustomerResolve(
    {
      fullName: data.fullName,
      phone: data.phone,
      email: data.email,
    },
    emailLookup.data,
    phoneLookup.data,
  );

  if (plan.action === "reuse" && plan.warn) {
    console.warn("[checkout/customer]", plan.warn);
  }

  let customerId: string;

  if (plan.action === "reuse") {
    customerId = plan.customerId;
    const { error: updateError } = await supabase
      .from("customers")
      .update({
        ...plan.updates,
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
      .insert(plan.insert)
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

  const contactSnapshot = {
    full_name: data.fullName,
    phone: data.phone,
    email: data.email,
  };

  let addressSnapshot: Json = { contact: contactSnapshot };

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
      contact: contactSnapshot,
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
      hold_session_id: gate.holdSessionId,
      ...(freteSnapshot ? { frete: freteSnapshot } : {}),
    };

    const expiresAt = new Date(
      Date.now() + PENDING_PAYMENT_TTL_MINUTES * 60_000,
    ).toISOString();

    const { data: orderRow, error: orderError } = await supabase
      .from("orders")
      .insert({
        public_code: publicCode,
        customer_id: customerId,
        order_type: ORDER_TYPE_STANDARD,
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
        // Issue #99 / D92: 10 min payment TTL (aligned with DB DEFAULT).
        expires_at: expiresAt,
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

  // Convert Hold Session → linked order (products stay hold until paid).
  let convertResult;
  try {
    convertResult = await convertHoldSession(gate.browserSessionId, orderId);
  } catch (error) {
    console.error("Falha ao converter Hold Session:", error);
    await supabase.from("order_items").delete().eq("order_id", orderId);
    await supabase.from("orders").delete().eq("id", orderId);
    return {
      success: false,
      error: "Não foi possível converter a reserva em pedido. Tente novamente.",
      code: "reservation_expired",
    };
  }

  const convertGate = interpretConvertHoldResult(convertResult);
  if (!convertGate.ok) {
    await supabase.from("order_items").delete().eq("order_id", orderId);
    await supabase.from("orders").delete().eq("id", orderId);
    return {
      success: false,
      error: convertGate.error,
      code: convertGate.code,
    };
  }

  const payment = await createCheckoutPreferenceForOrder(orderId, {
    holdSessionId: gate.holdSessionId,
  });

  if (!payment.success) {
    return {
      success: true,
      publicCode,
      orderId,
      initPoint: null,
      paymentError: payment.error,
    };
  }

  return {
    success: true,
    publicCode,
    orderId,
    initPoint: payment.initPoint,
  };
}
