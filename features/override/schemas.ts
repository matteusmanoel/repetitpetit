import { z } from "zod";

export const executeOverrideActionSchema = z.object({
  productId: z.string().uuid("Peça inválida."),
  staffId: z.string().uuid("Staff inválido."),
  reason: z
    .string()
    .trim()
    .min(10, "Informe o motivo com pelo menos 10 caracteres."),
  context: z.string().trim().max(500).optional(),
});

export type ExecuteOverrideActionInput = z.infer<
  typeof executeOverrideActionSchema
>;
