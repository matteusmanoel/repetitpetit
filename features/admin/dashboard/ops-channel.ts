import type { FulfillmentType } from "@/features/orders/types";

/** Canais do painel ops (labels alinhados ao VERDICT Slice P). */
export type OpsChannel = "sacolinha" | "entrega" | "balcao";

/**
 * Classifica um pedido pago nos 3 buckets do chart.
 * Balcão = POS (`channel=store` ou `store_counter`);
 * Entrega = delivery/correios; Sacolinha = retirada (`pickup`).
 */
export function classifyOpsChannel(
  channel: string,
  fulfillmentType: FulfillmentType,
): OpsChannel {
  if (channel === "store" || fulfillmentType === "store_counter") {
    return "balcao";
  }
  if (fulfillmentType === "delivery" || fulfillmentType === "correios") {
    return "entrega";
  }
  return "sacolinha";
}

export const OPS_CHANNEL_LABELS: Record<OpsChannel, string> = {
  sacolinha: "Sacolinha",
  entrega: "Entrega",
  balcao: "Balcão",
};
