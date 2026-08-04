import "server-only";

import { createServiceSupabaseClient } from "@/lib/supabase/server-service";
import type { Database, Json } from "@/lib/supabase/types";

export type HoldSessionRow = Database["public"]["Tables"]["hold_sessions"]["Row"];
export type HoldItemRow = Database["public"]["Tables"]["hold_items"]["Row"];

export type ReserveHoldResult =
  | {
      status: "ok";
      holdSessionId: string;
      expiresAt: string;
    }
  | { status: "limit_reached" }
  | { status: "unavailable" };

export type ReleaseHoldItemResult =
  | { status: "ok"; holdSessionId: string; productId: string }
  | { status: "not_found" };

export type ReleaseHoldSessionResult =
  | {
      status: "ok";
      holdSessionId: string;
      finalStatus: "cancelled" | "expired";
    }
  | { status: "not_found" }
  | { status: "invalid_status" };

export type ConvertHoldSessionResult =
  | { status: "ok"; holdSessionId: string; orderId: string }
  | { status: "not_found" }
  | { status: "order_not_found" }
  | { status: "expired" }
  | { status: "empty" };

export type HoldSessionSnapshot = {
  session: HoldSessionRow;
  items: HoldItemRow[];
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

/**
 * Atomically reserves a Peça into a Hold Session via `reserve_hold_item` (SN-02).
 * Sole path for available → hold. Service role only.
 */
export async function reserveHoldItem(
  sessionId: string,
  productId: string,
): Promise<ReserveHoldResult> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.rpc("reserve_hold_item", {
    p_session_id: sessionId,
    p_product_id: productId,
  });

  if (error) {
    console.error("Erro na RPC reserve_hold_item:", error);
    throw new Error("Falha ao reservar a peça na Hold Session.");
  }

  const payload = asRecord(data);
  const status = readStatus(payload);

  if (status === "ok") {
    const holdSessionId = payload?.hold_session_id;
    const expiresAt = payload?.expires_at;
    if (typeof holdSessionId !== "string" || typeof expiresAt !== "string") {
      throw new Error("Resposta inválida de reserve_hold_item.");
    }
    return { status: "ok", holdSessionId, expiresAt };
  }

  if (status === "limit_reached") {
    return { status: "limit_reached" };
  }

  return { status: "unavailable" };
}

/**
 * Releases one Peça from the active Hold Session (hold → available).
 */
export async function releaseHoldItem(
  sessionId: string,
  productId: string,
): Promise<ReleaseHoldItemResult> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.rpc("release_hold_item", {
    p_session_id: sessionId,
    p_product_id: productId,
  });

  if (error) {
    console.error("Erro na RPC release_hold_item:", error);
    throw new Error("Falha ao liberar a peça da Hold Session.");
  }

  const payload = asRecord(data);
  const status = readStatus(payload);

  if (status === "ok") {
    const holdSessionId = payload?.hold_session_id;
    const releasedProductId = payload?.product_id;
    if (typeof holdSessionId !== "string" || typeof releasedProductId !== "string") {
      throw new Error("Resposta inválida de release_hold_item.");
    }
    return {
      status: "ok",
      holdSessionId,
      productId: releasedProductId,
    };
  }

  return { status: "not_found" };
}

/**
 * Releases an entire active Hold Session.
 * SN-03 must call this with `finalStatus: 'expired'` — never duplicate status UPDATEs.
 */
export async function releaseHoldSession(
  sessionId: string,
  finalStatus: "cancelled" | "expired" = "cancelled",
): Promise<ReleaseHoldSessionResult> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.rpc("release_hold_session", {
    p_session_id: sessionId,
    p_final_status: finalStatus,
  });

  if (error) {
    console.error("Erro na RPC release_hold_session:", error);
    throw new Error("Falha ao liberar a Hold Session.");
  }

  const payload = asRecord(data);
  const status = readStatus(payload);

  if (status === "ok") {
    const holdSessionId = payload?.hold_session_id;
    const final = payload?.final_status;
    if (
      typeof holdSessionId !== "string" ||
      (final !== "cancelled" && final !== "expired")
    ) {
      throw new Error("Resposta inválida de release_hold_session.");
    }
    return { status: "ok", holdSessionId, finalStatus: final };
  }

  if (status === "invalid_status") {
    return { status: "invalid_status" };
  }

  return { status: "not_found" };
}

/**
 * Marks Hold Session converted and links `checkout_order_id`.
 * Does **not** set products.status = sold (SN-05 / SN-06).
 */
export async function convertHoldSession(
  sessionId: string,
  orderId: string,
): Promise<ConvertHoldSessionResult> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.rpc("convert_hold_session", {
    p_session_id: sessionId,
    p_order_id: orderId,
  });

  if (error) {
    console.error("Erro na RPC convert_hold_session:", error);
    throw new Error("Falha ao converter a Hold Session.");
  }

  const payload = asRecord(data);
  const status = readStatus(payload);

  if (status === "ok") {
    const holdSessionId = payload?.hold_session_id;
    const linkedOrderId = payload?.order_id;
    if (typeof holdSessionId !== "string" || typeof linkedOrderId !== "string") {
      throw new Error("Resposta inválida de convert_hold_session.");
    }
    return { status: "ok", holdSessionId, orderId: linkedOrderId };
  }

  if (
    status === "order_not_found" ||
    status === "expired" ||
    status === "empty"
  ) {
    return { status };
  }

  return { status: "not_found" };
}

/**
 * Reads the active Hold Session + items for a browser session cookie.
 */
export async function getHoldSession(
  sessionId: string,
): Promise<HoldSessionSnapshot | null> {
  const supabase = createServiceSupabaseClient();

  const { data: session, error: sessionError } = await supabase
    .from("hold_sessions")
    .select("*")
    .eq("session_id", sessionId)
    .eq("status", "active")
    .maybeSingle();

  if (sessionError) {
    console.error("Erro ao ler hold_sessions:", sessionError);
    throw new Error("Falha ao carregar a Hold Session.");
  }

  if (!session) {
    return null;
  }

  const { data: items, error: itemsError } = await supabase
    .from("hold_items")
    .select("*")
    .eq("hold_session_id", session.id)
    .order("created_at", { ascending: true });

  if (itemsError) {
    console.error("Erro ao ler hold_items:", itemsError);
    throw new Error("Falha ao carregar itens da Hold Session.");
  }

  return { session, items: items ?? [] };
}
