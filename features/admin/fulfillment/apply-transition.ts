import "server-only";

import type {
  FulfillmentTargetStatus,
} from "@/features/admin/fulfillment/transitions";
import {
  computePickupDeadlineIso,
  planFulfillmentTransition,
} from "@/features/admin/fulfillment/transitions";
import type { OrderStatus } from "@/features/orders/types";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";
import type { Database } from "@/lib/supabase/types";

type OrdersUpdate = Database["public"]["Tables"]["orders"]["Update"];

export type FulfillmentTransitionResult =
  | {
      ok: true;
      outcome: "applied" | "idempotent";
      orderId: string;
      status: OrderStatus;
      publicCode: string;
    }
  | {
      ok: false;
      error: string;
      code: "validation" | "not_found" | "denied" | "db";
    };

/**
 * Aplica transição de fulfillment via service role (D13) + order_events.
 * Idempotente: se já está no alvo, retorna sucesso sem segundo insert em events.
 */
export async function applyFulfillmentTransition(input: {
  orderId: string;
  target: FulfillmentTargetStatus;
  actorId: string;
  trackingCode?: string | null;
}): Promise<FulfillmentTransitionResult> {
  const supabase = createServiceSupabaseClient();

  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("id, public_code, status, tracking_code")
    .eq("id", input.orderId)
    .maybeSingle();

  if (fetchError) {
    console.error("applyFulfillmentTransition fetch:", fetchError);
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

  const plan = planFulfillmentTransition(order.status, input.target);

  if (plan.kind === "idempotent") {
    return {
      ok: true,
      outcome: "idempotent",
      orderId: order.id,
      status: plan.status,
      publicCode: order.public_code,
    };
  }

  if (plan.kind === "denied") {
    return { ok: false, error: plan.reason, code: "denied" };
  }

  const trackingCode = input.trackingCode?.trim() || null;
  if (plan.requiresTracking && !trackingCode) {
    return {
      ok: false,
      error: "Informe o código de rastreio.",
      code: "validation",
    };
  }

  const nowIso = new Date().toISOString();
  const patch: OrdersUpdate = {
    status: plan.to,
    updated_at: nowIso,
  };

  if (plan.setConfirmedAt) patch.confirmed_at = nowIso;
  if (plan.setCancelledAt) patch.cancelled_at = nowIso;
  if (plan.setCompletedAt) patch.completed_at = nowIso;
  if (plan.setTrackingCode && trackingCode) {
    patch.tracking_code = trackingCode;
  }
  if (plan.setReadyTimestamps) {
    patch.ready_since = nowIso;
    patch.pickup_deadline = computePickupDeadlineIso(nowIso);
  }

  const { data: updated, error: updateError } = await supabase
    .from("orders")
    .update(patch)
    .eq("id", order.id)
    .eq("status", plan.from)
    .select("id, public_code, status")
    .maybeSingle();

  if (updateError) {
    console.error("applyFulfillmentTransition update:", updateError);
    return {
      ok: false,
      error: "Não foi possível atualizar o status do pedido.",
      code: "db",
    };
  }

  if (!updated) {
    const { data: refreshed } = await supabase
      .from("orders")
      .select("id, public_code, status")
      .eq("id", order.id)
      .maybeSingle();

    if (refreshed?.status === input.target) {
      return {
        ok: true,
        outcome: "idempotent",
        orderId: refreshed.id,
        status: refreshed.status,
        publicCode: refreshed.public_code,
      };
    }

    return {
      ok: false,
      error: "O pedido mudou de status. Atualize a página e tente de novo.",
      code: "denied",
    };
  }

  const { error: eventError } = await supabase.from("order_events").insert({
    order_id: order.id,
    event_type: "status_changed",
    old_value: plan.from,
    new_value: plan.to,
    actor_type: "admin",
    actor_id: input.actorId,
  });

  if (eventError) {
    console.error("applyFulfillmentTransition order_events:", eventError);
    // Status já gravado — não reverte; o comprador já vê o novo status.
  }

  return {
    ok: true,
    outcome: "applied",
    orderId: updated.id,
    status: updated.status,
    publicCode: updated.public_code,
  };
}
