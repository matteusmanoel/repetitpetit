import "server-only";

import {
  releaseHoldItem,
  releaseHoldSession,
  reserveHoldItem,
} from "@/features/cart/hold-session";
import {
  planTransition,
  type InventoryTransition,
  type SoldChannel,
  type TransitionErrorReason,
} from "@/features/inventory/transitions";
import type { Json } from "@/lib/supabase/types";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

export type ApplyInventoryTransitionResult =
  | { ok: true; outcome?: "applied" | "already_sold" | "sn02" }
  | { ok: false; reason: string };

function asRecord(value: Json | null): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function mapRpcFailure(status: string | null): string {
  switch (status) {
    case "not_found":
      return "not_found";
    case "terminal_sold":
      return "terminal_sold";
    case "wrong_from":
      return "wrong_from";
    case "hold_session_mismatch":
      return "hold_session_mismatch";
    case "use_sn02":
      return "use_sn02";
    case "invalid":
      return "invalid";
    default:
      return status && status.length > 0 ? status : "db";
  }
}

async function loadActualHoldSessionId(
  productId: string,
): Promise<string | null> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("hold_items")
    .select("hold_session_id")
    .eq("product_id", productId)
    .maybeSingle();

  if (error) {
    console.error("applyInventoryTransition hold_items:", error);
    return null;
  }

  return data?.hold_session_id ?? null;
}

async function applyViaSn02(
  productId: string,
  transition: InventoryTransition,
): Promise<ApplyInventoryTransitionResult> {
  if (transition.from === "available" && transition.to === "hold") {
    const result = await reserveHoldItem(
      transition.context.holdSessionId,
      productId,
    );
    if (result.status === "ok") {
      return { ok: true, outcome: "sn02" };
    }
    return {
      ok: false,
      reason: result.status === "limit_reached" ? "limit_reached" : "unavailable",
    };
  }

  if (transition.from === "hold" && transition.to === "available") {
    if (transition.context.reason === "released") {
      const result = await releaseHoldItem(
        transition.context.holdSessionId,
        productId,
      );
      if (result.status === "ok") {
        return { ok: true, outcome: "sn02" };
      }
      return { ok: false, reason: "not_found" };
    }

    const finalStatus =
      transition.context.reason === "expired" ? "expired" : "cancelled";
    const result = await releaseHoldSession(
      transition.context.holdSessionId,
      finalStatus,
    );
    if (result.status === "ok") {
      return { ok: true, outcome: "sn02" };
    }
    return {
      ok: false,
      reason: result.status === "invalid_status" ? "invalid_status" : "not_found",
    };
  }

  return { ok: false, reason: "use_sn02" };
}

async function applyViaRpc(
  productId: string,
  transition: Extract<
    InventoryTransition,
    | { from: "hold"; to: "sold" }
    | { from: "available"; to: "sold" }
    | { from: "available"; to: "inactive" }
    | { from: "inactive"; to: "available" }
  >,
): Promise<ApplyInventoryTransitionResult> {
  const supabase = createServiceSupabaseClient();

  const soldChannel =
    transition.to === "sold" ? transition.context.channel : null;
  const holdSessionId =
    transition.from === "hold" && transition.to === "sold"
      ? transition.context.holdSessionId
      : null;
  const orderId =
    transition.to === "sold" ? transition.context.orderId : null;

  const { data, error } = await supabase.rpc("apply_inventory_transition", {
    p_product_id: productId,
    p_from: transition.from,
    p_to: transition.to,
    // Generated RPC args use `string | undefined` (not null).
    p_sold_channel: soldChannel ?? undefined,
    p_hold_session_id: holdSessionId ?? undefined,
    p_order_id: orderId ?? undefined,
  });

  if (error) {
    console.error("apply_inventory_transition rpc:", error);
    return { ok: false, reason: "db" };
  }

  const payload = asRecord(data);
  const status = typeof payload?.status === "string" ? payload.status : null;

  if (status === "ok") {
    const outcome =
      payload?.outcome === "already_sold" ? "already_sold" : "applied";
    return { ok: true, outcome };
  }

  return { ok: false, reason: mapRpcFailure(status) };
}

/**
 * Applies one inventory transition via service role (D13 / D66).
 *
 * - available↔hold → delegates to SN-02 RPCs (never bare UPDATE)
 * - sold / inactive → `apply_inventory_transition` SQL (FOR UPDATE)
 */
export async function applyInventoryTransition(
  productId: string,
  transition: InventoryTransition,
): Promise<ApplyInventoryTransitionResult> {
  if (!productId) {
    return { ok: false, reason: "invalid" };
  }

  const supabase = createServiceSupabaseClient();
  const { data: product, error: loadError } = await supabase
    .from("products")
    .select("id, status")
    .eq("id", productId)
    .maybeSingle();

  if (loadError) {
    console.error("applyInventoryTransition load:", loadError);
    return { ok: false, reason: "db" };
  }

  if (!product) {
    return { ok: false, reason: "not_found" };
  }

  // Idempotent sold retry before plan (plan rejects terminal sold).
  if (product.status === "sold" && transition.to === "sold") {
    return { ok: true, outcome: "already_sold" };
  }

  // Hold Session UUID match only for inventory-owned hold→sold.
  // available↔hold context.holdSessionId is the SN-02 cookie session_id.
  const planOpts =
    transition.from === "hold" && transition.to === "sold"
      ? { actualHoldSessionId: await loadActualHoldSessionId(productId) }
      : undefined;

  const plan = planTransition(product.status, transition, planOpts);

  if (plan.kind === "error") {
    return { ok: false, reason: plan.reason satisfies TransitionErrorReason };
  }

  if (plan.runtimeOwner === "sn02") {
    return applyViaSn02(productId, transition);
  }

  if (
    (transition.from === "hold" && transition.to === "sold") ||
    (transition.from === "available" && transition.to === "sold") ||
    (transition.from === "available" && transition.to === "inactive") ||
    (transition.from === "inactive" && transition.to === "available")
  ) {
    return applyViaRpc(productId, transition);
  }

  return { ok: false, reason: "invalid_transition" };
}

/**
 * Marks order line items sold after payment (online webhook / POS paid).
 * Chooses hold→sold or available→sold per current product projection.
 */
export async function markProductsSoldForOrder(input: {
  orderId: string;
  productIds: string[];
  channel: SoldChannel;
}): Promise<ApplyInventoryTransitionResult> {
  const uniqueIds = [...new Set(input.productIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { ok: true, outcome: "applied" };
  }

  const supabase = createServiceSupabaseClient();

  for (const productId of uniqueIds) {
    const { data: product, error } = await supabase
      .from("products")
      .select("id, status")
      .eq("id", productId)
      .maybeSingle();

    if (error) {
      console.error("markProductsSoldForOrder load:", error);
      return { ok: false, reason: "db" };
    }

    if (!product) {
      return { ok: false, reason: "not_found" };
    }

    if (product.status === "sold") {
      continue;
    }

    if (product.status === "hold") {
      const holdSessionId = await loadActualHoldSessionId(productId);
      if (!holdSessionId) {
        return { ok: false, reason: "hold_session_mismatch" };
      }

      const result = await applyInventoryTransition(productId, {
        from: "hold",
        to: "sold",
        context: {
          orderId: input.orderId,
          channel: input.channel,
          holdSessionId,
        },
      });

      if (!result.ok) {
        return result;
      }
      continue;
    }

    if (product.status === "available") {
      const result = await applyInventoryTransition(productId, {
        from: "available",
        to: "sold",
        context: {
          orderId: input.orderId,
          channel: input.channel,
        },
      });

      if (!result.ok) {
        return result;
      }
      continue;
    }

    return { ok: false, reason: "wrong_from" };
  }

  return { ok: true, outcome: "applied" };
}
