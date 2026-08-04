import "server-only";

import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

export type ProductStatusEventActor = "admin" | "system" | "customer";

export type EmitProductStatusEventInput = {
  productId: string;
  fromStatus: string | null;
  toStatus: string;
  actorType: ProductStatusEventActor;
  actorId?: string | null;
  context?: string | null;
  orderId?: string | null;
  notes?: string | null;
};

/**
 * SN-15 — insert one `product_status_events` row (service role).
 * Prefer SQL hooks inside RPCs; use this for TS-only paths (activation).
 */
export async function emitProductStatusEvent(
  input: EmitProductStatusEventInput,
): Promise<{ ok: true; id: string | null } | { ok: false; error: string }> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase.rpc("emit_product_status_event", {
    p_product_id: input.productId,
    p_from_status: input.fromStatus ?? "",
    p_to_status: input.toStatus,
    p_actor_type: input.actorType,
    p_actor_id: input.actorId ?? undefined,
    p_context: input.context ?? undefined,
    p_order_id: input.orderId ?? undefined,
    p_notes: input.notes ?? undefined,
  });

  if (error) {
    console.error("emitProductStatusEvent:", error);
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    id: typeof data === "string" ? data : null,
  };
}
