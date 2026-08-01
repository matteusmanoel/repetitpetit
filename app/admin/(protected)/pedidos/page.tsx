import type { Metadata } from "next";

import { FulfillmentQueueList } from "@/components/admin/FulfillmentQueueList";

export const metadata: Metadata = {
  title: "Pedidos · Repeti Petit",
};

/**
 * Fila de fulfillment (T19) — lista inicial via provider no layout;
 * Realtime atualiza cards, badge do nav e `<title>` sem refresh.
 * Transições "Conferir e separar" → #21.
 */
export default function AdminPedidosPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-extrabold text-foreground">
          Pedidos
        </h1>
        <p className="text-sm text-muted-foreground">
          Pedidos pagos aguardando conferência. Novos pagamentos entram na fila
          em tempo real.
        </p>
      </div>

      <FulfillmentQueueList />
    </div>
  );
}
