import type { FulfillmentType } from "@/features/orders/types";

/**
 * Texto de prazo (D12 / docs/02-prd.md).
 * Prefere `orders.estimated_fulfillment` gravado no checkout; senão fallback do SLA.
 */
export function resolveSlaText(
  estimatedFulfillment: string | null | undefined,
  fulfillmentType: FulfillmentType,
): string {
  const stored = estimatedFulfillment?.trim();
  if (stored) return stored;

  switch (fulfillmentType) {
    case "pickup":
      return "Pronta em até 4 horas úteis (mesmo dia se pedido até 16h)";
    case "delivery":
      return "Entrega em até 24 horas úteis";
    case "correios":
      return "Postado em até 1 dia útil após confirmação do pagamento";
    case "store_counter":
      return "Retirada imediata no balcão";
    default: {
      const _exhaustive: never = fulfillmentType;
      return _exhaustive;
    }
  }
}
