import "server-only";

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
 * Conta reservas de carrinho ainda válidas (`expires_at > now()`).
 * Fonte de verdade do KPI "reservadas" — não usa `products.status = reserved`
 * (a reserva atual não altera o status da peça; ver T13/D14).
 */
async function countActiveReservations(): Promise<number> {
  const supabase = createServiceSupabaseClient();
  const nowIso = new Date().toISOString();

  const { count, error } = await supabase
    .from("cart_reservations")
    .select("id", { count: "exact", head: true })
    .gt("expires_at", nowIso);

  if (error) {
    throw new Error(`Falha ao contar reservas ativas: ${error.message}`);
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

/**
 * Agrega os KPIs do `/admin` via service role (bypass RLS).
 * O layout `(protected)` já garante sessão admin antes desta página.
 */
export async function getAdminDashboardKpis(): Promise<AdminDashboardKpis> {
  const [
    productsAvailable,
    productsReserved,
    productsSold,
    ordersPaid,
    ordersConfirmed,
    ordersShipped,
  ] = await Promise.all([
    countProductsByStatus("available"),
    countActiveReservations(),
    countProductsByStatus("sold"),
    countOrdersByStatus("paid"),
    countOrdersByStatus("confirmed"),
    countOrdersByStatus("shipped"),
  ]);

  return {
    productsAvailable,
    productsReserved,
    productsSold,
    ordersPaid,
    ordersConfirmed,
    ordersShipped,
  };
}
