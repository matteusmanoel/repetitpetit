import "server-only";

import { isOrderPastPendingPayment } from "@/lib/mercado-pago/map-payment-status";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";
import type { Database } from "@/lib/supabase/types";

import { normalizePassportRpCode } from "@/features/passport/normalize-rp-code";
import type {
  PassportData,
  PassportHoldSession,
  PassportSale,
} from "@/features/passport/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

type HoldJoinRow = {
  hold_session_id: string;
  hold_sessions: {
    id: string;
    session_id: string;
    expires_at: string;
    status: string;
  } | null;
};

type OrderItemSaleRow = {
  order_id: string;
  orders: {
    id: string;
    public_code: string;
    channel: string;
    paid_at: string | null;
    created_at: string;
    status: OrderStatus;
  } | null;
};

/**
 * Garment Passport payload (SN-11): product by permanent `staff_code` (RP-…)
 * plus active hold (if any) and latest paid sale (if sold).
 * Service role only — never call from the client.
 */
export async function getPassportData(
  rpCode: string,
): Promise<PassportData | null> {
  const staffCode = normalizePassportRpCode(rpCode);
  if (!staffCode) return null;

  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from("products")
    .select("*, product_images(*)")
    .eq("staff_code", staffCode)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao carregar Passaporte: ${error.message}`);
  }

  if (!data) return null;

  const images = [...(data.product_images ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  const product = { ...data, product_images: images };

  const [hold, sale] = await Promise.all([
    loadActiveHold(product.id),
    product.status === "sold" ? loadLatestSale(product.id) : Promise.resolve(null),
  ]);

  return { product, hold, sale };
}

async function loadActiveHold(
  productId: string,
): Promise<PassportHoldSession | null> {
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
    console.error("getPassportData hold_items:", error);
    return null;
  }

  const row = data as HoldJoinRow | null;
  const session = row?.hold_sessions;
  if (!session || session.status !== "active") return null;

  return {
    id: session.id,
    sessionId: session.session_id,
    expiresAt: session.expires_at,
  };
}

async function loadLatestSale(productId: string): Promise<PassportSale | null> {
  const supabase = createServiceSupabaseClient();

  // Pull recent order_items for this Peça; filter to paid+ in app code
  // (PostgREST enum `in` is awkward across fulfillment statuses).
  const { data, error } = await supabase
    .from("order_items")
    .select(
      "order_id, orders!inner(id, public_code, channel, paid_at, created_at, status)",
    )
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("getPassportData order_items:", error);
    return null;
  }

  const rows = (data ?? []) as OrderItemSaleRow[];

  const paid = rows
    .map((row) => row.orders)
    .filter((order): order is NonNullable<typeof order> => Boolean(order))
    .filter(
      (order) =>
        order.status === "paid" || isOrderPastPendingPayment(order.status),
    )
    .sort((a, b) => {
      const aMs = new Date(a.paid_at ?? a.created_at).getTime();
      const bMs = new Date(b.paid_at ?? b.created_at).getTime();
      return bMs - aMs;
    });

  const order = paid[0];
  if (!order) return null;

  return {
    orderId: order.id,
    publicCode: order.public_code,
    channel: order.channel,
    soldAt: order.paid_at ?? order.created_at,
    status: order.status,
  };
}
