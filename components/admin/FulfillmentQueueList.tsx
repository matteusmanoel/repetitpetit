"use client";

import { FulfillmentOrderCard } from "@/components/admin/FulfillmentOrderCard";
import { useFulfillmentQueue } from "@/components/admin/FulfillmentQueueProvider";

/**
 * Seções da página `/admin/pedidos`: aguardando conferência + em progresso.
 */
export function FulfillmentQueueList() {
  const { orders, inProgressOrders, isRealtimeConnected } =
    useFulfillmentQueue();

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="fulfillment-paid-heading" className="flex flex-col gap-3">
        <div>
          <h2
            id="fulfillment-paid-heading"
            className="font-heading text-lg font-extrabold text-foreground"
          >
            Aguardando conferência
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pedidos pagos. Novos pagamentos entram aqui
            {isRealtimeConnected ? " em tempo real." : "."}
          </p>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum pedido aguardando conferência.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {orders.map((order) => (
              <li key={order.id}>
                <FulfillmentOrderCard order={order} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="fulfillment-progress-heading"
        className="flex flex-col gap-3"
      >
        <div>
          <h2
            id="fulfillment-progress-heading"
            className="font-heading text-lg font-extrabold text-foreground"
          >
            Em separação / envio
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pedidos conferidos — pronto para retirada, envio ou conclusão.
          </p>
        </div>

        {inProgressOrders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum pedido em separação no momento.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {inProgressOrders.map((order) => (
              <li key={order.id}>
                <FulfillmentOrderCard order={order} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
