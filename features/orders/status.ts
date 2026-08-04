import type { FulfillmentType, OrderStatus } from "@/features/orders/types";

export type ProgressStep = {
  id: string;
  label: string;
};

/** Status terminais que não avançam na barra de progresso. */
export function isTerminalFailureStatus(status: OrderStatus): boolean {
  return status === "cancelled" || status === "expired";
}

export function getOrderStatusLabel(status: OrderStatus): string {
  switch (status) {
    case "pending_payment":
      return "Aguardando pagamento";
    case "paid":
      return "Pagamento confirmado";
    case "confirmed":
      return "Em separação";
    case "ready_for_pickup":
      return "Pronto para retirada";
    case "shipped":
      return "Enviado";
    case "completed":
      return "Concluído";
    case "cancelled":
      return "Cancelado";
    case "expired":
      return "Expirado";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function getFulfillmentLabel(type: FulfillmentType): string {
  switch (type) {
    case "pickup":
      return "Retirada na loja";
    case "delivery":
      return "Entrega local";
    case "correios":
      return "Envio pelos Correios";
    case "store_counter":
      return "Venda no balcão";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

/**
 * Passos da barra de progresso — inclui confirmed e shipped/ready
 * (ADAPT do OrderProgressBar do Flor; status novos da Repeti).
 */
export function getProgressSteps(
  fulfillmentType: FulfillmentType,
): ProgressStep[] {
  const fulfillmentLabel =
    fulfillmentType === "pickup" ? "Pronto" : "Enviado";

  return [
    { id: "pending_payment", label: "Pedido" },
    { id: "paid", label: "Pago" },
    { id: "confirmed", label: "Separando" },
    { id: "fulfillment", label: fulfillmentLabel },
    { id: "completed", label: "Concluído" },
  ];
}

/**
 * Índice do passo atual (0-based). `-1` para cancelado/expirado.
 * `completed` marca o último passo como atual (todos preenchidos na UI).
 */
export function getProgressStepIndex(status: OrderStatus): number {
  switch (status) {
    case "pending_payment":
      return 0;
    case "paid":
      return 1;
    case "confirmed":
      return 2;
    case "ready_for_pickup":
    case "shipped":
      return 3;
    case "completed":
      return 4;
    case "cancelled":
    case "expired":
      return -1;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}
