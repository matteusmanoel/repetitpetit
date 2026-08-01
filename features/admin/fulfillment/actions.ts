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
} from "@/features/admin/fulfillment/schemas";
import type { FulfillmentQueueOrder } from "@/features/admin/fulfillment/types";
import { requireAdminSession } from "@/features/admin/session";

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
