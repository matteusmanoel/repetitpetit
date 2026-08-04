"use server";

import { requireAdminSession } from "@/features/admin/session";
import { releaseHoldSession } from "@/features/cart/hold-session";
import { markProductsSoldForOrder } from "@/features/inventory/apply-transition";
import { confirmStoreSaleSchema } from "@/features/pos/schemas";
import type { ConfirmStoreSaleResult } from "@/features/pos/types";
import { isOrderPastPendingPayment } from "@/lib/mercado-pago/map-payment-status";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

/**
 * Confirma pagamento de Order store → `paid` + inventário `sold`
 * com `sold_channel = store` via SN-05 (D65 / D71 / D80).
 *
 * Hold: allow on create; on confirm `markProductsSoldForOrder` (hold→sold)
 * deletes hold_items; then SN-02 `release_hold_session` finalizes any session
 * ainda `active` (não deixa órfã).
 */
export async function confirmStoreSaleAction(
  orderId: string,
  staffId: string,
): Promise<ConfirmStoreSaleResult> {
  await requireAdminSession();

  const parsed = confirmStoreSaleSchema.safeParse({ orderId, staffId });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      code: "validation",
    };
  }

  const supabase = createServiceSupabaseClient();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, public_code, status, payment_status, channel, paid_at")
    .eq("id", parsed.data.orderId)
    .maybeSingle();

  if (orderError) {
    console.error("confirmStoreSaleAction load:", orderError);
    return {
      ok: false,
      error: "Não foi possível carregar o pedido.",
      code: "db",
    };
  }

  if (!order) {
    return {
      ok: false,
      error: "Pedido não encontrado.",
      code: "not_found",
    };
  }

  if (order.channel !== "store") {
    return {
      ok: false,
      error: "Este pedido não é de venda no balcão.",
      code: "invalid",
    };
  }

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("product_id")
    .eq("order_id", order.id);

  if (itemsError) {
    console.error("confirmStoreSaleAction items:", itemsError);
    return {
      ok: false,
      error: "Não foi possível carregar os itens do pedido.",
      code: "db",
    };
  }

  const productIds = [
    ...new Set(
      (items ?? [])
        .map((row) => row.product_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];

  // Idempotente: já paid (ou além) — sem novo order_events; repara inventário.
  if (isOrderPastPendingPayment(order.status)) {
    const repaired = await repairStoreInventory(
      order.id,
      productIds,
    );
    if (!repaired.ok) {
      return repaired;
    }
    return {
      ok: true,
      outcome: "already_paid",
      orderId: order.id,
      publicCode: order.public_code,
    };
  }

  if (order.status !== "pending_payment") {
    return {
      ok: false,
      error: "Pedido não está aguardando confirmação de pagamento.",
      code: "invalid",
    };
  }

  const holdCookieSessionIds = await loadActiveHoldCookieSessionIds(
    productIds,
  );

  const nowIso = new Date().toISOString();

  const { data: updated, error: updateError } = await supabase
    .from("orders")
    .update({
      status: "paid",
      payment_status: "paid",
      paid_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", order.id)
    .eq("status", "pending_payment")
    .eq("channel", "store")
    .select("id, public_code, status")
    .maybeSingle();

  if (updateError) {
    console.error("confirmStoreSaleAction update:", updateError);
    return {
      ok: false,
      error: "Não foi possível confirmar o pagamento.",
      code: "db",
    };
  }

  if (!updated) {
    const { data: refreshed } = await supabase
      .from("orders")
      .select("id, public_code, status")
      .eq("id", order.id)
      .maybeSingle();

    if (refreshed && isOrderPastPendingPayment(refreshed.status)) {
      const repaired = await repairStoreInventory(
        refreshed.id,
        productIds,
      );
      if (!repaired.ok) {
        return repaired;
      }
      return {
        ok: true,
        outcome: "already_paid",
        orderId: refreshed.id,
        publicCode: refreshed.public_code,
      };
    }

    return {
      ok: false,
      error: "Pedido não está mais aguardando pagamento.",
      code: "invalid",
    };
  }

  const sold = await markProductsSoldForOrder({
    orderId: order.id,
    productIds,
    channel: "store",
  });

  if (!sold.ok) {
    console.error("confirmStoreSaleAction sold:", sold.reason);
    return {
      ok: false,
      error: "Pagamento confirmado, mas falhou ao marcar peças como vendidas.",
      code: "inventory",
    };
  }

  await finalizeActiveHoldSessions(holdCookieSessionIds);

  const { error: eventError } = await supabase.from("order_events").insert({
    order_id: order.id,
    event_type: "payment_confirmed",
    old_value: "pending_payment",
    new_value: "paid",
    actor_type: "admin",
    actor_id: parsed.data.staffId,
    notes: "POS store payment confirmation",
  });

  if (eventError) {
    console.error("confirmStoreSaleAction order_events:", eventError);
    // Pagamento já aplicado — não reverte.
  }

  return {
    ok: true,
    outcome: "applied",
    orderId: updated.id,
    publicCode: updated.public_code,
  };
}

async function repairStoreInventory(
  orderId: string,
  productIds: string[],
): Promise<ConfirmStoreSaleResult | { ok: true }> {
  if (productIds.length === 0) {
    return { ok: true };
  }

  const holdCookieSessionIds = await loadActiveHoldCookieSessionIds(productIds);

  const sold = await markProductsSoldForOrder({
    orderId,
    productIds,
    channel: "store",
  });

  if (!sold.ok) {
    console.error("confirmStoreSaleAction repair sold:", sold.reason);
    return {
      ok: false,
      error: "Pedido já pago, mas falhou ao sincronizar o inventário.",
      code: "inventory",
    };
  }

  await finalizeActiveHoldSessions(holdCookieSessionIds);
  return { ok: true };
}

/**
 * Cookie `session_id` das Hold Sessions ativas que ainda possuem as peças.
 * Capturado antes do sold (hold_items são apagados pela SN-05).
 */
async function loadActiveHoldCookieSessionIds(
  productIds: string[],
): Promise<string[]> {
  if (productIds.length === 0) {
    return [];
  }

  const supabase = createServiceSupabaseClient();
  const { data: holdItems, error: holdItemsError } = await supabase
    .from("hold_items")
    .select("hold_session_id")
    .in("product_id", productIds);

  if (holdItemsError) {
    console.error("loadActiveHoldCookieSessionIds hold_items:", holdItemsError);
    return [];
  }

  const holdSessionUuids = [
    ...new Set(
      (holdItems ?? [])
        .map((row) => row.hold_session_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];

  if (holdSessionUuids.length === 0) {
    return [];
  }

  const { data: sessions, error: sessionsError } = await supabase
    .from("hold_sessions")
    .select("session_id, status")
    .in("id", holdSessionUuids)
    .eq("status", "active");

  if (sessionsError) {
    console.error("loadActiveHoldCookieSessionIds sessions:", sessionsError);
    return [];
  }

  return [
    ...new Set(
      (sessions ?? [])
        .map((row) => row.session_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];
}

async function finalizeActiveHoldSessions(
  cookieSessionIds: string[],
): Promise<void> {
  for (const sessionId of cookieSessionIds) {
    try {
      const result = await releaseHoldSession(sessionId, "cancelled");
      if (result.status === "ok" || result.status === "not_found") {
        continue;
      }
      // invalid_status: já converted/cancelled — ok
    } catch (error) {
      console.error("finalizeActiveHoldSessions:", sessionId, error);
    }
  }
}
