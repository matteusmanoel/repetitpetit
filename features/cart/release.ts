import "server-only";

import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

export type ReleaseResult = { released: boolean };

/**
 * Libera a reserva da sessão para um `product_id`.
 * Idempotente: se não houver linha da sessão, `released` é `false`.
 */
export async function releaseProduct(
  productId: string,
  sessionId: string,
): Promise<ReleaseResult> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from("cart_reservations")
    .delete()
    .eq("product_id", productId)
    .eq("session_id", sessionId)
    .select("id");

  if (error) {
    console.error("Erro ao liberar reserva:", error);
    throw new Error("Falha ao liberar a reserva.");
  }

  return { released: (data?.length ?? 0) > 0 };
}
