import { z } from "zod";

/**
 * Corpo de `POST /api/cart/reserve`, `POST /api/cart/release`,
 * `POST /api/hold/reserve` e release de um item em `POST /api/hold/release`.
 */
export const cartProductBodySchema = z.object({
  productId: z.uuid("productId deve ser um UUID válido."),
});

export type CartProductBody = z.infer<typeof cartProductBodySchema>;

/** Corpo de `POST /api/hold/release` — item único ou sessão inteira. */
export const holdReleaseBodySchema = z.union([
  z.object({
    productId: z.uuid("productId deve ser um UUID válido."),
  }),
  z.object({
    releaseSession: z.literal(true),
    finalStatus: z.enum(["cancelled", "expired"]).optional(),
  }),
]);

export type HoldReleaseBody = z.infer<typeof holdReleaseBodySchema>;
