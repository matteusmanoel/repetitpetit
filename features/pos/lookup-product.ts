import "server-only";

import { isOrderPastPendingPayment } from "@/lib/mercado-pago/map-payment-status";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";
import type { Database } from "@/lib/supabase/types";

import {
  remainingHoldMinutes,
  resolvePosLookupQuery,
} from "@/features/pos/resolve-lookup-query";
import {
  deriveSellGate,
  type PosSellGate,
} from "@/features/pos/sell-gate";

type ProductStatus = Database["public"]["Enums"]["product_status"];
type ProductCondition = Database["public"]["Enums"]["product_condition"];
type OrderStatus = Database["public"]["Enums"]["order_status"];

export type { PosSellGate };
export { deriveSellGate };

export type PosLookupProduct = {
  id: string;
  name: string;
  staffCode: string | null;
  brand: string | null;
  sizeLabel: string | null;
  condition: ProductCondition;
  price: number;
  coverImageUrl: string | null;
  status: ProductStatus;
  soldChannel: string | null;
};

export type PosHoldInfo = {
  id: string;
  sessionId: string;
  expiresAt: string;
  /** Snapshot at lookup time — UI also shows live countdown. */
  remainingMinutes: number;
};

export type PosProductLookup = {
  product: PosLookupProduct;
  hold: PosHoldInfo | null;
  hasPendingOnlineOrder: boolean;
  hasPaidOrder: boolean;
  sellGate: PosSellGate;
};

export type LookupProductResult =
  | { ok: true; data: PosProductLookup }
  | { ok: false; error: string; code: "empty" | "not_found" | "db" };

type HoldJoinRow = {
  hold_session_id: string;
  hold_sessions: {
    id: string;
    session_id: string;
    expires_at: string;
    status: string;
  } | null;
};

type OrderItemClaimRow = {
  order_id: string;
  orders: {
    id: string;
    status: OrderStatus;
    channel: string;
  } | null;
};

/**
 * Resolve product by `staff_code` (RP-…) or UUID for POS (SN-08 / D86).
 * Includes active hold countdown info + online payment claim flags.
 * Service role only.
 */
export async function lookupProductForPos(
  query: string,
  nowMs: number = Date.now(),
): Promise<LookupProductResult> {
  const resolved = resolvePosLookupQuery(query);
  if (resolved.kind === "empty") {
    return {
      ok: false,
      error: "Informe o código RP ou o id da peça.",
      code: "empty",
    };
  }

  const supabase = createServiceSupabaseClient();

  let productQuery = supabase
    .from("products")
    .select(
      "id, name, staff_code, brand, size_label, condition, price, cover_image_url, status, sold_channel",
    );

  productQuery =
    resolved.kind === "id"
      ? productQuery.eq("id", resolved.id)
      : productQuery.eq("staff_code", resolved.staffCode);

  const { data: row, error } = await productQuery.maybeSingle();

  if (error) {
    console.error("lookupProductForPos:", error);
    return {
      ok: false,
      error: "Não foi possível buscar a peça. Tente novamente.",
      code: "db",
    };
  }

  if (!row) {
    return {
      ok: false,
      error: "Peça não encontrada.",
      code: "not_found",
    };
  }

  const [hold, claims] = await Promise.all([
    loadActiveHold(row.id, nowMs),
    loadOrderClaims(row.id),
  ]);

  const product: PosLookupProduct = {
    id: row.id,
    name: row.name,
    staffCode: row.staff_code,
    brand: row.brand,
    sizeLabel: row.size_label,
    condition: row.condition,
    price: Number(row.price),
    coverImageUrl: row.cover_image_url,
    status: row.status,
    soldChannel: row.sold_channel,
  };

  const sellGate = deriveSellGate({
    status: product.status,
    hasPendingOnlineOrder: claims.hasPendingOnlineOrder,
    hasPaidOrder: claims.hasPaidOrder,
  });

  return {
    ok: true,
    data: {
      product,
      hold,
      hasPendingOnlineOrder: claims.hasPendingOnlineOrder,
      hasPaidOrder: claims.hasPaidOrder,
      sellGate,
    },
  };
}

async function loadActiveHold(
  productId: string,
  nowMs: number,
): Promise<PosHoldInfo | null> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from("hold_items")
    .select(
      "hold_session_id, hold_sessions!inner(id, session_id, expires_at, status)",
    )
    .eq("product_id", productId)
    .eq("hold_sessions.status", "active")
    .maybeSingle();

  if (error) {
    console.error("lookupProductForPos hold_items:", error);
    return null;
  }

  const row = data as HoldJoinRow | null;
  const session = row?.hold_sessions;
  if (!session || session.status !== "active") return null;

  return {
    id: session.id,
    sessionId: session.session_id,
    expiresAt: session.expires_at,
    remainingMinutes: remainingHoldMinutes(session.expires_at, nowMs),
  };
}

async function loadOrderClaims(productId: string): Promise<{
  hasPendingOnlineOrder: boolean;
  hasPaidOrder: boolean;
}> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from("order_items")
    .select("order_id, orders!inner(id, status, channel)")
    .eq("product_id", productId)
    .limit(40);

  if (error) {
    console.error("lookupProductForPos order_items:", error);
    return { hasPendingOnlineOrder: false, hasPaidOrder: false };
  }

  const orders = ((data ?? []) as OrderItemClaimRow[])
    .map((row) => row.orders)
    .filter((order): order is NonNullable<typeof order> => Boolean(order));

  const hasPendingOnlineOrder = orders.some(
    (order) =>
      order.channel === "online" && order.status === "pending_payment",
  );

  const hasPaidOrder = orders.some(
    (order) =>
      order.status === "paid" || isOrderPastPendingPayment(order.status),
  );

  return { hasPendingOnlineOrder, hasPaidOrder };
}
