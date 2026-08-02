import { z } from "zod";

export const fulfillmentOrderIdSchema = z.object({
  orderId: z.string().uuid("Pedido inválido."),
});

export const shipOrderSchema = z.object({
  orderId: z.string().uuid("Pedido inválido."),
  trackingCode: z
    .string()
    .trim()
    .min(1, "Informe o código de rastreio.")
    .max(80, "Código de rastreio muito longo."),
});

export type ShipOrderInput = z.infer<typeof shipOrderSchema>;
