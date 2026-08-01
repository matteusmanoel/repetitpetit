import "server-only";

import { peekCartSessionId } from "@/features/cart";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

import type { ReservationView } from "./types";

/**
 * Lê a reserva ativa da peça e classifica em relação à sessão do cookie
 * `rp_cart_session`. Usa service role porque `anon` não tem SELECT em
 * `cart_reservations` (docs/04-data-model.md).
 */
export async function getProductReservationView(
  productId: string,
): Promise<ReservationView> {
  const supabase = createServiceSupabaseClient();
  const nowIso = new Date().toISOString();

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

  const sessionId = await peekCartSessionId();

  if (sessionId && data.session_id === sessionId) {
    return { kind: "own", expiresAt: data.expires_at };
  }

  return { kind: "other" };
}
