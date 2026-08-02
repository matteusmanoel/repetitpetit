import type { OrderStatus } from "@/features/orders/types";

import { isInProgressStatus } from "@/features/admin/fulfillment/transitions";
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

/** Entra/atualiza a lista "Em separação / envio". */
export function isInProgressQueuePayload(
  newRow: RealtimeOrderRow | null,
): boolean {
  return Boolean(newRow?.id && newRow.status && isInProgressStatus(newRow.status));
}

/** Sai da lista em progresso (concluído, cancelado, etc.). */
export function shouldRemoveFromInProgressQueue(
  oldRow: RealtimeOrderRow | null,
  newRow: RealtimeOrderRow | null,
): boolean {
  if (!newRow?.id) return false;
  const wasInProgress = Boolean(
    oldRow?.status && isInProgressStatus(oldRow.status),
  );
  const stillInProgress = Boolean(
    newRow.status && isInProgressStatus(newRow.status),
  );
  return wasInProgress && !stillInProgress;
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

/**
 * Aplica mudança local de status após server action (otimista / sync).
 * Move entre filas paid ↔ em progresso conforme o novo status.
 */
export function applyLocalStatusChange(
  paid: readonly FulfillmentQueueOrder[],
  inProgress: readonly FulfillmentQueueOrder[],
  orderId: string,
  next: Pick<FulfillmentQueueOrder, "status"> &
    Partial<Pick<FulfillmentQueueOrder, "trackingCode">>,
): {
  paid: FulfillmentQueueOrder[];
  inProgress: FulfillmentQueueOrder[];
} {
  const fromPaid = paid.find((o) => o.id === orderId);
  const fromInProgress = inProgress.find((o) => o.id === orderId);
  const base = fromPaid ?? fromInProgress;

  if (!base) {
    return { paid: [...paid], inProgress: [...inProgress] };
  }

  const updated: FulfillmentQueueOrder = {
    ...base,
    status: next.status,
    trackingCode:
      next.trackingCode !== undefined ? next.trackingCode : base.trackingCode,
  };

  const withoutPaid = removeQueueOrder(paid, orderId);
  const withoutInProgress = removeQueueOrder(inProgress, orderId);

  if (updated.status === "paid") {
    return {
      paid: upsertQueueOrder(withoutPaid, updated),
      inProgress: withoutInProgress,
    };
  }

  if (isInProgressStatus(updated.status)) {
    return {
      paid: withoutPaid,
      inProgress: upsertQueueOrder(withoutInProgress, updated),
    };
  }

  // completed / cancelled / outros terminais — some das duas listas
  return { paid: withoutPaid, inProgress: withoutInProgress };
}

/** Badge no `<title>` da aba quando há pedidos pagos aguardando. */
export function formatQueueDocumentTitle(count: number): string {
  if (count <= 0) {
    return "Pedidos · Repeti Petit";
  }
  return `(${count}) Pedidos · Repeti Petit`;
}
