"use client";

import { FulfillmentOrderCard } from "@/components/admin/FulfillmentOrderCard";
import { useFulfillmentQueue } from "@/components/admin/FulfillmentQueueProvider";

/**
 * Lista da fila em `/admin/pedidos` — consome o provider (SSR + Realtime).
 */
export function FulfillmentQueueList() {
  const { orders, isRealtimeConnected } = useFulfillmentQueue();

  if (orders.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
        <p className="font-heading text-base font-extrabold text-foreground">
          Nenhum pedido pago na fila
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Quando um pagamento for confirmado, o pedido aparece aqui na hora
          {isRealtimeConnected ? ", sem precisar atualizar a página." : "."}
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {orders.map((order) => (
        <li key={order.id}>
          <FulfillmentOrderCard order={order} />
        </li>
      ))}
    </ul>
  );
}
