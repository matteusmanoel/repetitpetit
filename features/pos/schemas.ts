import { z } from "zod";

/** API input — alinhado a `payment_provider` (cash | card_local | pix_local). */
export const storePaymentMethodInputSchema = z.enum([
  "cash",
  "card_local",
  "pix_local",
]);

export const createStoreOrderSchema = z.object({
  productIds: z
    .array(z.string().uuid("Peça inválida."))
    .min(1, "Selecione ao menos uma peça."),
  staffId: z.string().min(1, "Staff inválido."),
  paymentMethod: storePaymentMethodInputSchema,
  customerNote: z
    .string()
    .trim()
    .max(500, "Observação muito longa.")
    .optional(),
  customerId: z.string().uuid("Cliente inválido.").nullable().optional(),
});

export const confirmStoreSaleSchema = z.object({
  orderId: z.string().uuid("Pedido inválido."),
  staffId: z.string().min(1, "Staff inválido."),
});

export type CreateStoreOrderInput = z.infer<typeof createStoreOrderSchema>;
export type ConfirmStoreSaleInput = z.infer<typeof confirmStoreSaleSchema>;
