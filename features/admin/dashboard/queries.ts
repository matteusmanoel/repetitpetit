import "server-only";

import {
  getHoldExpiringSoonCutoff,
  getSaoPauloDayBounds,
} from "@/features/admin/dashboard/kpi-helpers";
import type { AdminDashboardKpis } from "@/features/admin/dashboard/types";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

async function countProductsByStatus(
  status: "available" | "sold",
): Promise<number> {
  const supabase = createServiceSupabaseClient();

  const { count, error } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("status", status);

  if (error) {
    throw new Error(`Falha ao contar produtos (${status}): ${error.message}`);
  }

  return count ?? 0;
}

/**
 * Conta Hold Sessions ativas ainda válidas (`status = active` e
 * `expires_at > now()`). Fonte de verdade do KPI "Holds ativos" (D66) —
 * não usa `cart_reservations` nem `products.status = hold`.
 */
async function countActiveHolds(): Promise<number> {
  const supabase = createServiceSupabaseClient();
  const nowIso = new Date().toISOString();

  const { count, error } = await supabase
    .from("hold_sessions")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .gt("expires_at", nowIso);

  if (error) {
    throw new Error(`Falha ao contar holds ativas: ${error.message}`);
  }

  return count ?? 0;
}

/**
 * Holds ativas com expiração em ≤ 5 minutos (inclui já vencidas ainda
 * `active` — urgência operacional até o cron SN-03).
 */
async function countHoldsExpiringSoon(): Promise<number> {
  const supabase = createServiceSupabaseClient();
  const soonIso = getHoldExpiringSoonCutoff();

  const { count, error } = await supabase
    .from("hold_sessions")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .lte("expires_at", soonIso);

  if (error) {
    throw new Error(`Falha ao contar holds expirando: ${error.message}`);
  }

  return count ?? 0;
}

async function countOrdersByStatus(
  status: "paid" | "confirmed" | "shipped",
): Promise<number> {
  const supabase = createServiceSupabaseClient();

  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("status", status);

  if (error) {
    throw new Error(`Falha ao contar pedidos (${status}): ${error.message}`);
  }

  return count ?? 0;
}

async function countStoreOrdersToday(): Promise<number> {
  const supabase = createServiceSupabaseClient();
  const { startIso, nextDayStartIso } = getSaoPauloDayBounds();

  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("channel", "store")
    .gte("created_at", startIso)
    .lt("created_at", nextDayStartIso);

  if (error) {
    throw new Error(`Falha ao contar vendas loja hoje: ${error.message}`);
  }

  return count ?? 0;
}

async function countOverridesToday(): Promise<number> {
  const supabase = createServiceSupabaseClient();
  const { startIso, nextDayStartIso } = getSaoPauloDayBounds();

  const { count, error } = await supabase
    .from("override_events")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startIso)
    .lt("created_at", nextDayStartIso);

  if (error) {
    throw new Error(`Falha ao contar overrides hoje: ${error.message}`);
  }

  return count ?? 0;
}

/**
 * Agrega os KPIs do `/admin` via service role (bypass RLS).
 * O layout `(protected)` já garante sessão admin antes desta página.
 */
export async function getAdminDashboardKpis(): Promise<AdminDashboardKpis> {
  const [
    productsAvailable,
    activeHolds,
    holdsExpiringSoon,
    productsSold,
    ordersPaid,
    ordersConfirmed,
    ordersShipped,
    storeOrdersToday,
    overridesToday,
  ] = await Promise.all([
    countProductsByStatus("available"),
    countActiveHolds(),
    countHoldsExpiringSoon(),
    countProductsByStatus("sold"),
    countOrdersByStatus("paid"),
    countOrdersByStatus("confirmed"),
    countOrdersByStatus("shipped"),
    countStoreOrdersToday(),
    countOverridesToday(),
  ]);

  return {
    productsAvailable,
    activeHolds,
    holdsExpiringSoon,
    productsSold,
    ordersPaid,
    ordersConfirmed,
    ordersShipped,
    storeOrdersToday,
    overridesToday,
  };
}
