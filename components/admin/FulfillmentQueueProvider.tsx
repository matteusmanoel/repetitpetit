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

import { fetchFulfillmentQueueOrderAction } from "@/features/admin/fulfillment/actions";
import { playOrderNotificationBeep } from "@/features/admin/fulfillment/notify-beep";
import {
  formatQueueDocumentTitle,
  isPaidQueuePayload,
  removeQueueOrder,
  shouldRemoveFromPaidQueue,
  upsertQueueOrder,
} from "@/features/admin/fulfillment/queue-logic";
import type { FulfillmentQueueOrder } from "@/features/admin/fulfillment/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { Database } from "@/lib/supabase/types";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];

type FulfillmentQueueContextValue = {
  orders: FulfillmentQueueOrder[];
  paidCount: number;
  isRealtimeConnected: boolean;
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
 * Assina Realtime em todo o admin (badge no nav + title) e mantém a lista
 * da fila. Pedidos iniciais vêm do SSR (service role); eventos novos são
 * enriquecidos via server action.
 */
export function FulfillmentQueueProvider({
  initialOrders,
  children,
}: {
  initialOrders: FulfillmentQueueOrder[];
  children: ReactNode;
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const pathname = usePathname();
  const knownIdsRef = useRef(new Set(initialOrders.map((o) => o.id)));
  const enrichingRef = useRef(new Set<string>());

  useEffect(() => {
    setOrders(initialOrders);
    knownIdsRef.current = new Set(initialOrders.map((o) => o.id));
  }, [initialOrders]);

  const paidCount = orders.length;

  useEffect(() => {
    if (paidCount > 0) {
      document.title = formatQueueDocumentTitle(paidCount);
      return;
    }

    if (pathname?.startsWith("/admin/pedidos")) {
      document.title = formatQueueDocumentTitle(0);
    }
  }, [paidCount, pathname]);

  const enqueuePaidOrder = useCallback(async (orderId: string) => {
    if (enrichingRef.current.has(orderId)) return;
    enrichingRef.current.add(orderId);

    try {
      const full = await fetchFulfillmentQueueOrderAction(orderId);
      if (!full) return;

      const isNew = !knownIdsRef.current.has(full.id);
      knownIdsRef.current.add(full.id);

      setOrders((prev) => upsertQueueOrder(prev, full));

      if (isNew) {
        playOrderNotificationBeep();
      }
    } finally {
      enrichingRef.current.delete(orderId);
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
        knownIdsRef.current.delete(newStatus.id);
        setOrders((prev) => removeQueueOrder(prev, newStatus.id));
        return;
      }

      if (isPaidQueuePayload(newStatus) && newStatus?.id) {
        void enqueuePaidOrder(newStatus.id);
      }
    },
    [enqueuePaidOrder],
  );

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    // UPDATE é o caminho real (webhook: pending_payment → paid).
    // INSERT + filter status=eq.paid cobre o caso raro de insert já pago.
    // Sem filter no UPDATE: o NEW row é filtrado no handler (isPaidQueuePayload).
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
      orders,
      paidCount,
      isRealtimeConnected,
    }),
    [orders, paidCount, isRealtimeConnected],
  );

  return (
    <FulfillmentQueueContext.Provider value={value}>
      {children}
    </FulfillmentQueueContext.Provider>
  );
}
