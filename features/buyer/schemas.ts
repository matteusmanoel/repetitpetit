import { z } from "zod";

/**
 * Magic-link request (SO-03 / D103). E-mail only — no password.
 */
export const buyerMagicLinkSchema = z.object({
  email: z
    .string({ error: "Informe seu e-mail." })
    .min(1, "Informe seu e-mail.")
    .email("Informe um e-mail válido.")
    .transform((value) => value.trim().toLowerCase()),
  /** Relative path after callback, e.g. `/sacolinha` or `/pedido/RP-…`. */
  next: z.string().optional(),
});

export type BuyerMagicLinkInput = z.infer<typeof buyerMagicLinkSchema>;
