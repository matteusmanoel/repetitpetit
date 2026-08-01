import type { OrderStatus } from "@/features/orders/types";

import type { FulfillmentQueueOrder } from "@/features/admin/fulfillment/types";

type RealtimeOrderRow = {
  id?: string;
  status?: OrderStatus | string;
};

/**
 * Pedidos entram na fila quando o NEW row está `paid`.
 * O fluxo real é UPDATE (pending_payment → paid via webhook) — INSERT com
 * status=paid é raro, mas aceito.
 */
export function isPaidQueuePayload(newRow: RealtimeOrderRow | null): boolean {
  return Boolean(newRow?.id && newRow.status === "paid");
}

/**
 * Remove da fila quando o pedido deixa de ser `paid` (ex.: #21 confirmed).
 */
export function shouldRemoveFromPaidQueue(
  oldRow: RealtimeOrderRow | null,
  newRow: RealtimeOrderRow | null,
): boolean {
  if (!newRow?.id) return false;
  const wasPaid = oldRow?.status === "paid";
  const stillPaid = newRow.status === "paid";
  return wasPaid && !stillPaid;
}

/**
 * Insere/atualiza o pedido no topo da fila (mais recente primeiro).
 * Deduplica por `id`. Ordena por `paidAt` desc, depois `createdAt` desc.
 */
export function upsertQueueOrder(
  current: readonly FulfillmentQueueOrder[],
  incoming: FulfillmentQueueOrder,
): FulfillmentQueueOrder[] {
  const without = current.filter((order) => order.id !== incoming.id);
  return [incoming, ...without].sort((a, b) => {
    const aPaid = a.paidAt ?? a.createdAt;
    const bPaid = b.paidAt ?? b.createdAt;
    return bPaid.localeCompare(aPaid);
  });
}

export function removeQueueOrder(
  current: readonly FulfillmentQueueOrder[],
  orderId: string,
): FulfillmentQueueOrder[] {
  return current.filter((order) => order.id !== orderId);
}

/** Badge no `<title>` da aba quando há pedidos pagos aguardando. */
export function formatQueueDocumentTitle(count: number): string {
  if (count <= 0) {
    return "Pedidos · Repeti Petit";
  }
  return `(${count}) Pedidos · Repeti Petit`;
}
