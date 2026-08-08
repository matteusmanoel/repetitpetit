import { isUrgentDeliveryFulfillment } from "@/features/admin/fulfillment/queue-logic";
import type { FulfillmentQueueOrder } from "@/features/admin/fulfillment/types";
import { getOrderStatusLabel } from "@/features/orders/status";
import type { OrderStatus } from "@/features/orders/types";

export type SeparacaoFilter =
  | "a_separar"
  | "em_separacao"
  | "urgente"
  | "all";

export const SEPARACAO_FILTERS: {
  id: SeparacaoFilter;
  label: string;
}[] = [
  { id: "a_separar", label: "A separar" },
  { id: "em_separacao", label: "Em separação" },
  { id: "urgente", label: "Urgente" },
  { id: "all", label: "Todos" },
];

/** Peças por página na grade do pedido selecionado (VERDICT / D121). */
export const SEPARACAO_PAGE_SIZE = 6;

export function orderAllPacked(order: FulfillmentQueueOrder): boolean {
  return (
    order.items.length > 0 && order.items.every((item) => Boolean(item.packedAt))
  );
}

export function packedCount(order: FulfillmentQueueOrder): number {
  return order.items.filter((item) => Boolean(item.packedAt)).length;
}

/** Status PT para cards / grade de Separação. */
export function getSeparacaoStatusLabel(status: OrderStatus): string {
  if (status === "paid") return "Pago · a separar";
  return getOrderStatusLabel(status);
}

/**
 * Filtra pedidos da fila (paid + em progresso) por chip + busca
 * (cliente, código ou nome de peça).
 */
export function filterSeparacaoOrders(
  orders: readonly FulfillmentQueueOrder[],
  filter: SeparacaoFilter,
  query: string,
): FulfillmentQueueOrder[] {
  const q = query.trim().toLowerCase();

  return orders.filter((order) => {
    if (filter === "a_separar" && order.status !== "paid") return false;

    if (filter === "em_separacao") {
      const partial =
        order.items.some((i) => i.packedAt) &&
        order.items.some((i) => !i.packedAt);
      if (!(order.status === "confirmed" || partial)) return false;
    }

    if (filter === "urgente" && !isUrgentDeliveryFulfillment(order.fulfillmentType)) {
      return false;
    }

    if (!q) return true;

    if ((order.customerName ?? "").toLowerCase().includes(q)) return true;
    if (order.publicCode.toLowerCase().includes(q)) return true;
    return order.items.some((item) =>
      item.productName.toLowerCase().includes(q),
    );
  });
}

/** Data/hora de compra (âncora visual — CONTEXT Fila / Separação). */
export function formatPurchaseWhen(iso: string | null | undefined): string {
  if (!iso) return "Agora";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/**
 * Atualiza `packedAt` de um item em ambas as filas (otimista / pós-action).
 * Não altera `orders.status`.
 */
export function applyLocalPackedAt(
  paid: readonly FulfillmentQueueOrder[],
  inProgress: readonly FulfillmentQueueOrder[],
  orderId: string,
  orderItemId: string,
  packedAt: string | null,
): {
  paid: FulfillmentQueueOrder[];
  inProgress: FulfillmentQueueOrder[];
} {
  const patch = (list: readonly FulfillmentQueueOrder[]) =>
    list.map((order) => {
      if (order.id !== orderId) return order;
      return {
        ...order,
        items: order.items.map((item) =>
          item.id === orderItemId ? { ...item, packedAt } : item,
        ),
      };
    });

  return {
    paid: patch(paid),
    inProgress: patch(inProgress),
  };
}
