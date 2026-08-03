import "server-only";

import { assertOverrideAllowed } from "@/features/override/assert-override-allowed";
import {
  executeOverrideActionSchema,
  type ExecuteOverrideActionInput,
} from "@/features/override/schemas";
import type { Database, Json } from "@/lib/supabase/types";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

type OrderStatus = Database["public"]["Enums"]["order_status"];
type ProductStatus = Database["public"]["Enums"]["product_status"];

export type ExecuteOverrideActionSuccess = {
  ok: true;
  outcome: "applied" | "noop";
  overrideEventId: string | null;
  affectedHoldSessionId: string | null;
  affectedOrderId: string | null;
};

export type ExecuteOverrideActionFailure = {
  ok: false;
  reason:
    | "already_paid"
    | "not_found"
    | "invalid_status"
    | "validation"
    | "db"
    | "hold_release_failed";
  error: string;
};

export type ExecuteOverrideActionResult =
  | ExecuteOverrideActionSuccess
  | ExecuteOverrideActionFailure;

export type ExecuteOverrideActionDeps = {
  supabase?: ReturnType<typeof createServiceSupabaseClient>;
};

function asRecord(value: Json | null): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function readStatus(payload: Record<string, unknown> | null): string | null {
  const status = payload?.status;
  return typeof status === "string" ? status : null;
}

function readString(
  payload: Record<string, unknown> | null,
  key: string,
): string | null {
  const value = payload?.[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * SN-13 Override — atomically cancel Hold Session and/or pending online
 * payment claim, then insert `override_events` (D62 / D72 / D84).
 *
 * Lives in `features/override/` next to `assertOverrideAllowed` (not
 * `features/pos/override.ts`) so the paid-block gate and the mutation share
 * one module. POS/Passport call this via the reusable UI + server action.
 *
 * MUST call `assertOverrideAllowed` before mutating. Hold → available only
 * via SN-02 inside `execute_override_action` RPC.
 */
export async function executeOverrideAction(
  input: ExecuteOverrideActionInput,
  deps: ExecuteOverrideActionDeps = {},
): Promise<ExecuteOverrideActionResult> {
  const parsed = executeOverrideActionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      reason: "validation",
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const { productId, staffId, reason, context } = parsed.data;
  const supabase = deps.supabase ?? createServiceSupabaseClient();

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, status")
    .eq("id", productId)
    .maybeSingle();

  if (productError) {
    console.error("executeOverrideAction product:", productError);
    return {
      ok: false,
      reason: "db",
      error: "Não foi possível carregar a peça.",
    };
  }

  if (!product) {
    return {
      ok: false,
      reason: "not_found",
      error: "Peça não encontrada.",
    };
  }

  if ((product.status as ProductStatus) === "sold") {
    // Align with assertOverrideAllowed / D62 — sold means payment already won.
    return {
      ok: false,
      reason: "already_paid",
      error: "Peça já vendida — override não permitido.",
    };
  }

  const gateLookup = await loadOnlineOrderForGate(supabase, productId);
  if (!gateLookup.ok) {
    return gateLookup;
  }
  const gate = assertOverrideAllowed(gateLookup.order);
  if (!gate.ok) {
    return {
      ok: false,
      reason: gate.reason,
      error: "Pedido já pago — override não permitido.",
    };
  }

  const { data, error } = await supabase.rpc("execute_override_action", {
    p_product_id: productId,
    p_staff_id: staffId,
    p_reason: reason,
    ...(context ? { p_context: context } : {}),
  });

  if (error) {
    console.error("executeOverrideAction rpc:", error);
    return {
      ok: false,
      reason: "db",
      error: "Não foi possível executar o override.",
    };
  }

  const payload = asRecord(data);
  const status = readStatus(payload);

  if (status === "already_paid") {
    return {
      ok: false,
      reason: "already_paid",
      error: "Pedido já pago — override não permitido.",
    };
  }

  if (status === "not_found") {
    return {
      ok: false,
      reason: "not_found",
      error: "Peça não encontrada.",
    };
  }

  if (status === "invalid_status") {
    return {
      ok: false,
      reason: "invalid_status",
      error: "Status da peça não permite override.",
    };
  }

  if (status === "hold_release_failed") {
    return {
      ok: false,
      reason: "hold_release_failed",
      error: "Não foi possível liberar a Hold Session.",
    };
  }

  if (status === "invalid") {
    return {
      ok: false,
      reason: "validation",
      error: "Dados inválidos para override.",
    };
  }

  if (status !== "ok") {
    return {
      ok: false,
      reason: "db",
      error: "Resposta inesperada do override.",
    };
  }

  const outcome =
    payload?.outcome === "noop" ? ("noop" as const) : ("applied" as const);
  const overrideEventId = readString(payload, "override_event_id");
  const affectedHoldSessionId = readString(payload, "affected_hold_session_id");
  const affectedOrderId = readString(payload, "affected_order_id");

  // Stub customer notify — WhatsApp/email in Slice N+1.
  if (outcome === "applied") {
    console.info(
      `[SN-13] stub customer notify — override applied product=${productId}` +
        (affectedOrderId ? ` order=${affectedOrderId}` : "") +
        (affectedHoldSessionId
          ? ` hold_session=${affectedHoldSessionId}`
          : "") +
        `; reason=${reason}` +
        // TODO(Slice N+1): WhatsApp/email notify for cancelled hold/pending claim
        ` — TODO WhatsApp/email`,
    );
  }

  return {
    ok: true,
    outcome,
    overrideEventId,
    affectedHoldSessionId,
    affectedOrderId,
  };
}

type GateLookupResult =
  | { ok: true; order: { status: OrderStatus } | null }
  | ExecuteOverrideActionFailure;

/**
 * Loads the online order that should feed `assertOverrideAllowed`
 * (prefer any post-payment status; else pending_payment).
 * DB errors fail closed — never mutate without a successful gate read.
 */
async function loadOnlineOrderForGate(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  productId: string,
): Promise<GateLookupResult> {
  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("order_id")
    .eq("product_id", productId);

  if (itemsError) {
    console.error("executeOverrideAction order_items:", itemsError);
    return {
      ok: false,
      reason: "db",
      error: "Não foi possível verificar pedidos da peça.",
    };
  }

  const orderIds = [
    ...new Set(
      (items ?? [])
        .map((row) => row.order_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];

  if (orderIds.length === 0) {
    return { ok: true, order: null };
  }

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id, status, channel, created_at")
    .in("id", orderIds)
    .eq("channel", "online")
    .order("created_at", { ascending: false });

  if (ordersError) {
    console.error("executeOverrideAction orders:", ordersError);
    return {
      ok: false,
      reason: "db",
      error: "Não foi possível verificar pedidos da peça.",
    };
  }

  if (!orders || orders.length === 0) {
    return { ok: true, order: null };
  }

  const blocking = orders.find((order) => {
    const gate = assertOverrideAllowed({ status: order.status });
    return !gate.ok;
  });
  if (blocking) {
    return { ok: true, order: { status: blocking.status } };
  }

  const pending = orders.find((order) => order.status === "pending_payment");
  if (pending) {
    return { ok: true, order: { status: pending.status } };
  }

  return { ok: true, order: { status: orders[0].status } };
}
