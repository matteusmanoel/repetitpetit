import "server-only";

import { createServiceSupabaseClient } from "@/lib/supabase/server-service";
import type { Database } from "@/lib/supabase/types";

import type { CartReservation, ReserveResult } from "@/features/cart/types";

type ServiceClient = ReturnType<typeof createServiceSupabaseClient>;

/**
 * Reserva atômica de uma peça para a sessão de carrinho.
 *
 * Prefere a RPC `reserve_cart_product` (migration T13): DELETE da linha expirada
 * + `INSERT ... WHERE NOT EXISTS` na mesma transação (D14). Se a RPC ainda não
 * estiver aplicada no projeto Supabase, cai no fallback service-role que faz o
 * DELETE antes do INSERT e trata `23505` (UNIQUE) como indisponível.
 */
export async function reserveProduct(
  productId: string,
  sessionId: string,
): Promise<ReserveResult> {
  const supabase = createServiceSupabaseClient();

  const rpcResult = await tryReserveViaRpc(supabase, productId, sessionId);

  if (rpcResult !== "missing") {
    return rpcResult;
  }

  return reserveProductFallback(supabase, productId, sessionId);
}

async function tryReserveViaRpc(
  supabase: ServiceClient,
  productId: string,
  sessionId: string,
): Promise<ReserveResult | "missing"> {
  const { data, error } = await supabase.rpc("reserve_cart_product", {
    p_product_id: productId,
    p_session_id: sessionId,
  });

  if (error) {
    // Função ainda não existe / não está no schema cache do PostgREST.
    if (error.code === "PGRST202" || error.message?.includes("reserve_cart_product")) {
      return "missing";
    }

    console.error("Erro na RPC reserve_cart_product:", error);
    throw new Error("Falha ao reservar o produto.");
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row) {
    return { ok: false, reason: "unavailable" };
  }

  return { ok: true, reservation: row as CartReservation };
}

/**
 * Fallback sem RPC: DELETE expirada (D14 "antes do INSERT") + INSERT com
 * checagem de disponibilidade; UNIQUE (product_id) serializa a corrida.
 */
export async function reserveProductFallback(
  supabase: ServiceClient,
  productId: string,
  sessionId: string,
): Promise<ReserveResult> {
  const nowIso = new Date().toISOString();

  const { error: deleteError } = await supabase
    .from("cart_reservations")
    .delete()
    .eq("product_id", productId)
    .lte("expires_at", nowIso);

  if (deleteError) {
    console.error("Erro ao limpar reserva expirada:", deleteError);
    throw new Error("Falha ao reservar o produto.");
  }

  const { data: existingOwn, error: ownError } = await supabase
    .from("cart_reservations")
    .select("*")
    .eq("product_id", productId)
    .eq("session_id", sessionId)
    .gt("expires_at", nowIso)
    .maybeSingle();

  if (ownError) {
    console.error("Erro ao buscar reserva da sessão:", ownError);
    throw new Error("Falha ao reservar o produto.");
  }

  if (existingOwn) {
    return { ok: true, reservation: existingOwn };
  }

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, status, quantity")
    .eq("id", productId)
    .maybeSingle();

  if (productError) {
    console.error("Erro ao buscar produto para reserva:", productError);
    throw new Error("Falha ao reservar o produto.");
  }

  if (!product || product.status !== "available" || product.quantity <= 0) {
    return { ok: false, reason: "unavailable" };
  }

  const { data: activeHold, error: holdError } = await supabase
    .from("cart_reservations")
    .select("id")
    .eq("product_id", productId)
    .gt("expires_at", nowIso)
    .maybeSingle();

  if (holdError) {
    console.error("Erro ao checar reserva ativa:", holdError);
    throw new Error("Falha ao reservar o produto.");
  }

  if (activeHold) {
    return { ok: false, reason: "unavailable" };
  }

  const insertPayload: Database["public"]["Tables"]["cart_reservations"]["Insert"] = {
    product_id: productId,
    session_id: sessionId,
  };

  const { data: inserted, error: insertError } = await supabase
    .from("cart_reservations")
    .insert(insertPayload)
    .select("*")
    .single();

  if (insertError) {
    // Corrida: outra sessão ganhou o UNIQUE (product_id).
    if (insertError.code === "23505") {
      return { ok: false, reason: "unavailable" };
    }

    console.error("Erro ao inserir reserva:", insertError);
    throw new Error("Falha ao reservar o produto.");
  }

  return { ok: true, reservation: inserted };
}
