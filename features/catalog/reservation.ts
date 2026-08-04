import "server-only";

import { peekCartSessionId } from "@/features/cart";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

import type { ReservationView } from "./types";

/**
 * Dual-read: Hold Session first (SN-04), legacy `cart_reservations` fallback.
 * Cookie `rp_cart_session` is the browser Hold Session id (D79).
 */
export async function getProductReservationView(
  productId: string,
): Promise<ReservationView> {
  const supabase = createServiceSupabaseClient();
  const sessionId = await peekCartSessionId();
  const nowIso = new Date().toISOString();

  const { data: holdItem, error: holdItemError } = await supabase
    .from("hold_items")
    .select("hold_session_id")
    .eq("product_id", productId)
    .maybeSingle();

  if (holdItemError) {
    console.error("Falha ao consultar hold_items:", holdItemError);
  } else if (holdItem) {
    const { data: holdSession, error: holdSessionError } = await supabase
      .from("hold_sessions")
      .select("session_id, status, expires_at")
      .eq("id", holdItem.hold_session_id)
      .eq("status", "active")
      .gt("expires_at", nowIso)
      .maybeSingle();

    if (holdSessionError) {
      console.error("Falha ao consultar hold_sessions:", holdSessionError);
    } else if (holdSession) {
      if (sessionId && holdSession.session_id === sessionId) {
        return { kind: "own", expiresAt: holdSession.expires_at };
      }
      return { kind: "other" };
    }
  }

  const { data, error } = await supabase
    .from("cart_reservations")
    .select("session_id, expires_at")
    .eq("product_id", productId)
    .gt("expires_at", nowIso)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao consultar reserva: ${error.message}`);
  }

  if (!data) {
    return { kind: "none" };
  }

  if (sessionId && data.session_id === sessionId) {
    return { kind: "own", expiresAt: data.expires_at };
  }

  return { kind: "other" };
}
