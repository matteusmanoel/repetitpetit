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

/** Toggle Separação check — apenas `order_items.packed_at` (ADR 0002). */
export const toggleOrderItemPackedSchema = z.object({
  orderItemId: z.string().uuid("Item inválido."),
});

export type ToggleOrderItemPackedInput = z.infer<
  typeof toggleOrderItemPackedSchema
>;
