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
import { usePathname } from "next/navigation";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

import {
  fetchFulfillmentOrderByIdAction,
  fetchFulfillmentQueueOrderAction,
} from "@/features/admin/fulfillment/actions";
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
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const pathname = usePathname();
  const knownPaidIdsRef = useRef(new Set(initialOrders.map((o) => o.id)));
  const enrichingRef = useRef(new Set<string>());

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

  const handleChange = useCallback(
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
        return;
      }

      if (isInProgressQueuePayload(newStatus) && newStatus?.id) {
        void enqueueInProgressOrder(newStatus.id);
      }
    },
    [enqueuePaidOrder, enqueueInProgressOrder],
  );

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    // UPDATE é o caminho real (webhook: pending_payment → paid).
    // INSERT + filter status=eq.paid cobre o caso raro de insert já pago.
    const channel = supabase
      .channel("fulfillment-queue")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
        },
        handleChange,
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: "status=eq.paid",
        },
        handleChange,
      )
      .subscribe((status) => {
        setIsRealtimeConnected(status === "SUBSCRIBED");
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [handleChange]);

  const value = useMemo(
    () => ({
      orders: queues.paid,
      inProgressOrders: queues.inProgress,
      paidCount,
      isRealtimeConnected,
      applyLocalTransition,
    }),
    [queues, paidCount, isRealtimeConnected, applyLocalTransition],
  );

  return (
    <FulfillmentQueueContext.Provider value={value}>
      {children}
    </FulfillmentQueueContext.Provider>
  );
}
