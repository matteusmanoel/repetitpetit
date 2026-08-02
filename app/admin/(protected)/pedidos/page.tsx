import type { Metadata } from "next";

import { FulfillmentQueueList } from "@/components/admin/FulfillmentQueueList";

export const metadata: Metadata = {
  title: "Pedidos · Repeti Petit",
};

/**
 * Fila de fulfillment (T19 + T20) — listas via provider no layout;
 * Realtime atualiza cards, badge do nav e `<title>` sem refresh.
 * Transições: conferir, pronto, enviado, concluído, cancelar.
 */
export default function AdminPedidosPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">Pedidos</h1>
        <p className="text-sm text-muted-foreground">
          Conferência e fulfillment. Pedidos pagos entram na fila em tempo real;
          avance o status conforme separar, enviar ou concluir.
        </p>
      </div>

      <FulfillmentQueueList />
    </div>
  );
}
