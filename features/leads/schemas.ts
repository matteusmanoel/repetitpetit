import { z } from "zod";

/**
 * Schema do e-mail capturado pelo popup da home.
 * Sem cupom — só persiste o lead (docs/05-ux-direction.md, D10).
 */
export const leadEmailSchema = z.object({
  email: z
    .string({ error: "Informe seu e-mail." })
    .trim()
    .toLowerCase()
    .min(1, "Informe seu e-mail.")
    .email("Informe um e-mail válido.")
    .max(254, "E-mail muito longo."),
});

export type LeadEmailInput = z.infer<typeof leadEmailSchema>;
