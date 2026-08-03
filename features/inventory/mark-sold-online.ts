import "server-only";

/**
 * Temporary SN-04 helper: mark Peças sold after online payment.
 *
 * TODO(SN-05): replace with `features/inventory/apply-transition` (central
 * inventory state machine). Do not duplicate sold rules elsewhere once SN-05 lands.
 */

import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

export type MarkSoldOnlineResult =
  | { ok: true }
  | { ok: false; error: string };

export async function markProductsSoldOnline(
  productIds: string[],
  nowIso: string = new Date().toISOString(),
): Promise<MarkSoldOnlineResult> {
  if (productIds.length === 0) {
    return { ok: true };
  }

  const supabase = createServiceSupabaseClient();
  const { error } = await supabase
    .from("products")
    .update({
      status: "sold",
      sold_channel: "online",
      updated_at: nowIso,
    })
    .in("id", productIds);

  if (error) {
    console.error("markProductsSoldOnline:", error);
    return {
      ok: false,
      error: "Pagamento confirmado, mas falhou ao marcar peças como vendidas.",
    };
  }

  return { ok: true };
}
