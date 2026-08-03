"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

import {
  fetchFulfillmentOrderByIdAction,
  fetchFulfillmentQueueOrderAction,
} from "@/features/admin/fulfillment/actions";
import {
  applyProductStatusToCache,
  shouldRefreshDashboardForHoldEvent,
} from "@/features/admin/fulfillment/inventory-realtime";
import { playOrderNotificationBeep } from "@/features/admin/fulfillment/notify-beep";
import {
  applyLocalStatusChange,
  formatQueueDocumentTitle,
  isInProgressQueuePayload,
  isPaidQueuePayload,
  removeQueueOrder,
  shouldRemoveFromInProgressQueue,
  shouldRemoveFromPaidQueue,
  upsertQueueOrder,
} from "@/features/admin/fulfillment/queue-logic";
import type { FulfillmentQueueOrder } from "@/features/admin/fulfillment/types";
import type { OrderStatus } from "@/features/orders/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { Database } from "@/lib/supabase/types";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type HoldSessionRow = Database["public"]["Tables"]["hold_sessions"]["Row"];

type QueueState = {
  paid: FulfillmentQueueOrder[];
  inProgress: FulfillmentQueueOrder[];
};

type FulfillmentQueueContextValue = {
  /** Pedidos `paid` (fila de conferência) — alias histórico `orders`. */
  orders: FulfillmentQueueOrder[];
  inProgressOrders: FulfillmentQueueOrder[];
  paidCount: number;
  isRealtimeConnected: boolean;
  /**
   * Cache leve de `products.status` (hold/available) para POS/Passport
   * abertos no admin. `sold` remove a entrada.
   */
  productStatusCache: Readonly<Record<string, string>>;
  applyLocalTransition: (
    orderId: string,
    status: OrderStatus,
    extras?: { trackingCode?: string | null },
  ) => void;
};

const FulfillmentQueueContext =
  createContext<FulfillmentQueueContextValue | null>(null);

export function useFulfillmentQueue(): FulfillmentQueueContextValue {
  const value = useContext(FulfillmentQueueContext);
  if (!value) {
    throw new Error(
      "useFulfillmentQueue deve ser usado dentro de FulfillmentQueueProvider.",
    );
  }
  return value;
}

/**
 * Assina Realtime em todo o admin (badge no nav + title) e mantém as listas
 * paid + em progresso. Pedidos iniciais vêm do SSR (service role).
 * SN-14: também escuta `products` (status hold/available/sold) e
 * `hold_sessions` para invalidar cache e refrescar KPIs do `/admin`.
 */
export function FulfillmentQueueProvider({
  initialOrders,
  initialInProgressOrders = [],
  children,
}: {
  initialOrders: FulfillmentQueueOrder[];
  initialInProgressOrders?: FulfillmentQueueOrder[];
  children: ReactNode;
}) {
  const [queues, setQueues] = useState<QueueState>({
    paid: initialOrders,
    inProgress: initialInProgressOrders,
  });
  const [productStatusCache, setProductStatusCache] = useState<
    Record<string, string>
  >({});
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const knownPaidIdsRef = useRef(new Set(initialOrders.map((o) => o.id)));
  const enrichingRef = useRef(new Set<string>());
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    setQueues({
      paid: initialOrders,
      inProgress: initialInProgressOrders,
    });
    knownPaidIdsRef.current = new Set(initialOrders.map((o) => o.id));
  }, [initialOrders, initialInProgressOrders]);

  const paidCount = queues.paid.length;

  useEffect(() => {
    if (paidCount > 0) {
      document.title = formatQueueDocumentTitle(paidCount);
      return;
    }

    if (pathname?.startsWith("/admin/pedidos")) {
      document.title = formatQueueDocumentTitle(0);
    }
  }, [paidCount, pathname]);

  const refreshDashboardIfNeeded = useCallback(() => {
    const path = pathnameRef.current;
    if (path === "/admin" || path === "/admin/") {
      router.refresh();
    }
  }, [router]);

  const applyLocalTransition = useCallback(
    (
      orderId: string,
      status: OrderStatus,
      extras?: { trackingCode?: string | null },
    ) => {
      if (status !== "paid") {
        knownPaidIdsRef.current.delete(orderId);
      }

      setQueues((prev) =>
        applyLocalStatusChange(prev.paid, prev.inProgress, orderId, {
          status,
          trackingCode: extras?.trackingCode ?? undefined,
        }),
      );
    },
    [],
  );

  const enqueuePaidOrder = useCallback(async (orderId: string) => {
    if (enrichingRef.current.has(`paid:${orderId}`)) return;
    enrichingRef.current.add(`paid:${orderId}`);

    try {
      const full = await fetchFulfillmentQueueOrderAction(orderId);
      if (!full) return;

      const isNew = !knownPaidIdsRef.current.has(full.id);
      knownPaidIdsRef.current.add(full.id);

      setQueues((prev) => ({
        paid: upsertQueueOrder(prev.paid, full),
        inProgress: removeQueueOrder(prev.inProgress, full.id),
      }));

      if (isNew) {
        playOrderNotificationBeep();
      }
    } finally {
      enrichingRef.current.delete(`paid:${orderId}`);
    }
  }, []);

  const enqueueInProgressOrder = useCallback(async (orderId: string) => {
    if (enrichingRef.current.has(`progress:${orderId}`)) return;
    enrichingRef.current.add(`progress:${orderId}`);

    try {
      const full = await fetchFulfillmentOrderByIdAction(orderId);
      if (!full || !isInProgressQueuePayload(full)) return;

      knownPaidIdsRef.current.delete(full.id);
      setQueues((prev) => ({
        paid: removeQueueOrder(prev.paid, full.id),
        inProgress: upsertQueueOrder(prev.inProgress, full),
      }));
    } finally {
      enrichingRef.current.delete(`progress:${orderId}`);
    }
  }, []);

  const handleOrderChange = useCallback(
    (payload: RealtimePostgresChangesPayload<OrderRow>) => {
      const newRow = payload.new as Partial<OrderRow>;
      const oldRow = payload.old as Partial<OrderRow>;

      const newStatus = newRow?.id
        ? { id: String(newRow.id), status: newRow.status }
        : null;
      const oldStatus = oldRow?.status
        ? {
            id: oldRow.id ? String(oldRow.id) : undefined,
            status: oldRow.status,
          }
        : null;

      if (shouldRemoveFromPaidQueue(oldStatus, newStatus) && newStatus?.id) {
        knownPaidIdsRef.current.delete(newStatus.id);
        setQueues((prev) => ({
          ...prev,
          paid: removeQueueOrder(prev.paid, newStatus.id),
        }));
      }

      if (
        shouldRemoveFromInProgressQueue(oldStatus, newStatus) &&
        newStatus?.id
      ) {
        setQueues((prev) => ({
          ...prev,
          inProgress: removeQueueOrder(prev.inProgress, newStatus.id),
        }));
      }

      if (isPaidQueuePayload(newStatus) && newStatus?.id) {
        void enqueuePaidOrder(newStatus.id);
        refreshDashboardIfNeeded();
        return;
      }

      if (isInProgressQueuePayload(newStatus) && newStatus?.id) {
        void enqueueInProgressOrder(newStatus.id);
      }

      // Pedidos canal loja (create/confirm) podem alterar KPIs do painel.
      if (newRow?.channel === "store") {
        refreshDashboardIfNeeded();
      }
    },
    [enqueuePaidOrder, enqueueInProgressOrder, refreshDashboardIfNeeded],
  );

  const handleProductChange = useCallback(
    (payload: RealtimePostgresChangesPayload<ProductRow>) => {
      try {
        const newRow = payload.new as Partial<ProductRow> | null;
        setProductStatusCache((prev) =>
          applyProductStatusToCache(prev, {
            id: newRow?.id ? String(newRow.id) : undefined,
            status: newRow?.status ?? undefined,
          }),
        );

        // hold/available/sold na peça pode mudar contagem de holds no painel
        // (projeção) — refresh só no /admin.
        if (
          newRow?.status === "hold" ||
          newRow?.status === "available" ||
          newRow?.status === "sold"
        ) {
          refreshDashboardIfNeeded();
        }
      } catch {
        // Realtime de inventário é best-effort — nunca derruba a fila.
      }
    },
    [refreshDashboardIfNeeded],
  );

  const handleHoldSessionChange = useCallback(
    (payload: RealtimePostgresChangesPayload<HoldSessionRow>) => {
      try {
        const newRow = payload.new as Partial<HoldSessionRow> | null;
        if (shouldRefreshDashboardForHoldEvent(newRow?.status)) {
          refreshDashboardIfNeeded();
        }
      } catch {
        // same best-effort policy as products
      }
    },
    [refreshDashboardIfNeeded],
  );

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    // UPDATE é o caminho real (webhook: pending_payment → paid).
    // INSERT + filter status=eq.paid cobre o caso raro de insert já pago.
    // SN-14: products + hold_sessions para cache POS e KPIs do painel.
    const channel = supabase
      .channel("fulfillment-queue")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
        },
        handleOrderChange,
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: "status=eq.paid",
        },
        handleOrderChange,
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "products",
        },
        handleProductChange,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "hold_sessions",
        },
        handleHoldSessionChange,
      )
      .subscribe((status) => {
        setIsRealtimeConnected(status === "SUBSCRIBED");
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [handleOrderChange, handleProductChange, handleHoldSessionChange]);

  const value = useMemo(
    () => ({
      orders: queues.paid,
      inProgressOrders: queues.inProgress,
      paidCount,
      isRealtimeConnected,
      productStatusCache,
      applyLocalTransition,
    }),
    [
      queues,
      paidCount,
      isRealtimeConnected,
      productStatusCache,
      applyLocalTransition,
    ],
  );

  return (
    <FulfillmentQueueContext.Provider value={value}>
      {children}
    </FulfillmentQueueContext.Provider>
  );
}
