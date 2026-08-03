import "server-only";

import { isOrderPastPendingPayment } from "@/lib/mercado-pago/map-payment-status";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";
import type { Database } from "@/lib/supabase/types";

import { normalizePassportRpCode } from "@/features/passport/normalize-rp-code";
import type {
  PassportData,
  PassportHistoryEvent,
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
    store_payment_method: string | null;
  } | null;
};

function salePaymentMethod(
  channel: string,
  storePaymentMethod: string | null,
): string | null {
  if (channel === "store") return storePaymentMethod;
  if (channel === "online") return "mercado_pago";
  return storePaymentMethod;
}

type StatusEventRow = {
  id: string;
  created_at: string;
  from_status: string | null;
  to_status: string;
  actor_type: string;
  actor_id: string | null;
  context: string | null;
  notes: string | null;
  order_id: string | null;
};

/**
 * Garment Passport payload (SN-11 / SN-15): product by permanent `staff_code`
 * plus active hold, latest paid sale, and status timeline.
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

  const [hold, sale, history] = await Promise.all([
    loadActiveHold(product.id),
    product.status === "sold" ? loadLatestSale(product.id) : Promise.resolve(null),
    loadStatusHistory(product.id),
  ]);

  return { product, hold, sale, history };
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

  const { data, error } = await supabase
    .from("order_items")
    .select(
      "order_id, orders!inner(id, public_code, channel, paid_at, created_at, status, store_payment_method)",
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
    paymentMethod: salePaymentMethod(
      order.channel,
      order.store_payment_method,
    ),
  };
}

async function loadStatusHistory(
  productId: string,
): Promise<PassportHistoryEvent[]> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from("product_status_events")
    .select(
      "id, created_at, from_status, to_status, actor_type, actor_id, context, notes, order_id",
    )
    .eq("product_id", productId)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    console.error("getPassportData product_status_events:", error);
    return [];
  }

  const rows = (data ?? []) as StatusEventRow[];
  if (rows.length === 0) return [];

  const actorIds = [
    ...new Set(
      rows
        .filter((row) => row.actor_type === "admin" && row.actor_id)
        .map((row) => row.actor_id as string),
    ),
  ];
  const orderIds = [
    ...new Set(
      rows
        .map((row) => row.order_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];

  const [adminsRes, ordersRes] = await Promise.all([
    actorIds.length > 0
      ? supabase.from("admins").select("id, full_name, email").in("id", actorIds)
      : Promise.resolve({ data: [], error: null }),
    orderIds.length > 0
      ? supabase
          .from("orders")
          .select("id, public_code, channel, store_payment_method")
          .in("id", orderIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (adminsRes.error) {
    console.error("getPassportData admins:", adminsRes.error);
  }
  if (ordersRes.error) {
    console.error("getPassportData history orders:", ordersRes.error);
  }

  const adminById = new Map(
    (adminsRes.data ?? []).map((admin) => [
      admin.id,
      admin.full_name?.trim() || admin.email,
    ]),
  );
  const orderById = new Map(
    (ordersRes.data ?? []).map((order) => [order.id, order]),
  );

  return rows.map((row) => {
    const order = row.order_id ? orderById.get(row.order_id) : undefined;
    return {
      id: row.id,
      createdAt: row.created_at,
      fromStatus: row.from_status,
      toStatus: row.to_status,
      actorType: row.actor_type,
      actorId: row.actor_id,
      actorName:
        row.actor_type === "admin" && row.actor_id
          ? (adminById.get(row.actor_id) ?? null)
          : null,
      context: row.context,
      notes: row.notes,
      orderId: row.order_id,
      orderPublicCode: order?.public_code ?? null,
      saleChannel: order?.channel ?? null,
      paymentMethod: order
        ? salePaymentMethod(order.channel, order.store_payment_method)
        : null,
    };
  });
}
