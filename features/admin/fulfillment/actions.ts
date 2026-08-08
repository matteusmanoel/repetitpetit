"use server";

import { applyFulfillmentTransition } from "@/features/admin/fulfillment/apply-transition";
import type { FulfillmentTransitionResult } from "@/features/admin/fulfillment/apply-transition";
import {
  getFulfillmentQueueOrderById,
  getPaidFulfillmentQueueOrderById,
} from "@/features/admin/fulfillment/queries";
import {
  fulfillmentOrderIdSchema,
  shipOrderSchema,
  toggleOrderItemPackedSchema,
} from "@/features/admin/fulfillment/schemas";
import type { FulfillmentQueueOrder } from "@/features/admin/fulfillment/types";
import { requireAdminSession } from "@/features/admin/session";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

/**
 * Enriquecimento pós-Realtime: o canal entrega a row de `orders`; itens e
 * cliente vêm via service role (D13). Exige sessão admin.
 */
export async function fetchFulfillmentQueueOrderAction(
  orderId: string,
): Promise<FulfillmentQueueOrder | null> {
  await requireAdminSession();

  if (!orderId || typeof orderId !== "string") {
    return null;
  }

  return getPaidFulfillmentQueueOrderById(orderId);
}

/** Enrich genérico (paid ou em progresso) após transição / Realtime. */
export async function fetchFulfillmentOrderByIdAction(
  orderId: string,
): Promise<FulfillmentQueueOrder | null> {
  await requireAdminSession();

  if (!orderId || typeof orderId !== "string") {
    return null;
  }

  return getFulfillmentQueueOrderById(orderId);
}

export async function confirmOrderAction(
  orderId: string,
): Promise<FulfillmentTransitionResult> {
  const session = await requireAdminSession();
  const parsed = fulfillmentOrderIdSchema.safeParse({ orderId });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Pedido inválido.",
      code: "validation",
    };
  }

  return applyFulfillmentTransition({
    orderId: parsed.data.orderId,
    target: "confirmed",
    actorId: session.admin.id,
  });
}

export async function markReadyForPickupAction(
  orderId: string,
): Promise<FulfillmentTransitionResult> {
  const session = await requireAdminSession();
  const parsed = fulfillmentOrderIdSchema.safeParse({ orderId });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Pedido inválido.",
      code: "validation",
    };
  }

  return applyFulfillmentTransition({
    orderId: parsed.data.orderId,
    target: "ready_for_pickup",
    actorId: session.admin.id,
  });
}

/** Sacolinha path (D105): confirmed → na_sacolinha (+ ready_since / deadline). */
export async function markNaSacolinhaAction(
  orderId: string,
): Promise<FulfillmentTransitionResult> {
  const session = await requireAdminSession();
  const parsed = fulfillmentOrderIdSchema.safeParse({ orderId });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Pedido inválido.",
      code: "validation",
    };
  }

  return applyFulfillmentTransition({
    orderId: parsed.data.orderId,
    target: "na_sacolinha",
    actorId: session.admin.id,
  });
}

export async function markShippedAction(
  orderId: string,
  trackingCode: string,
): Promise<FulfillmentTransitionResult> {
  const session = await requireAdminSession();
  const parsed = shipOrderSchema.safeParse({ orderId, trackingCode });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      code: "validation",
    };
  }

  return applyFulfillmentTransition({
    orderId: parsed.data.orderId,
    target: "shipped",
    actorId: session.admin.id,
    trackingCode: parsed.data.trackingCode,
  });
}

export async function completeOrderAction(
  orderId: string,
): Promise<FulfillmentTransitionResult> {
  const session = await requireAdminSession();
  const parsed = fulfillmentOrderIdSchema.safeParse({ orderId });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Pedido inválido.",
      code: "validation",
    };
  }

  return applyFulfillmentTransition({
    orderId: parsed.data.orderId,
    target: "completed",
    actorId: session.admin.id,
  });
}

export async function cancelOrderAction(
  orderId: string,
): Promise<FulfillmentTransitionResult> {
  const session = await requireAdminSession();
  const parsed = fulfillmentOrderIdSchema.safeParse({ orderId });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Pedido inválido.",
      code: "validation",
    };
  }

  return applyFulfillmentTransition({
    orderId: parsed.data.orderId,
    target: "cancelled",
    actorId: session.admin.id,
  });
}

export type ToggleOrderItemPackedResult =
  | {
      ok: true;
      orderId: string;
      orderItemId: string;
      packedAt: string | null;
    }
  | {
      ok: false;
      error: string;
      code: "validation" | "not_found" | "db";
    };

/**
 * Toggle Separação check em `order_items.packed_at` (ADR 0002 / #139).
 * Não altera `orders.status` — próxima ação de fulfillment continua explícita.
 */
export async function toggleOrderItemPackedAction(
  orderItemId: string,
): Promise<ToggleOrderItemPackedResult> {
  await requireAdminSession();

  const parsed = toggleOrderItemPackedSchema.safeParse({ orderItemId });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Item inválido.",
      code: "validation",
    };
  }

  const supabase = createServiceSupabaseClient();
  const { data: item, error: fetchError } = await supabase
    .from("order_items")
    .select("id, order_id, packed_at")
    .eq("id", parsed.data.orderItemId)
    .maybeSingle();

  if (fetchError) {
    console.error("toggleOrderItemPackedAction fetch:", fetchError);
    return {
      ok: false,
      error: "Não foi possível carregar o item.",
      code: "db",
    };
  }

  if (!item) {
    return { ok: false, error: "Item não encontrado.", code: "not_found" };
  }

  const nextPackedAt = item.packed_at ? null : new Date().toISOString();

  const { data: updated, error: updateError } = await supabase
    .from("order_items")
    .update({ packed_at: nextPackedAt })
    .eq("id", item.id)
    .select("id, order_id, packed_at")
    .maybeSingle();

  if (updateError || !updated) {
    console.error("toggleOrderItemPackedAction update:", updateError);
    return {
      ok: false,
      error: "Não foi possível atualizar o check de separação.",
      code: "db",
    };
  }

  return {
    ok: true,
    orderId: updated.order_id,
    orderItemId: updated.id,
    packedAt: updated.packed_at,
  };
}

