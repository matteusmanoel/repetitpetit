import { z } from "zod";

/**
 * Corpo de `POST /api/cart/reserve` e `POST /api/cart/release`.
 */
export const cartProductBodySchema = z.object({
  productId: z.uuid("productId deve ser um UUID válido."),
});

export type CartProductBody = z.infer<typeof cartProductBodySchema>;
