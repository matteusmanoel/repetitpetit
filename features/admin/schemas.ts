import { z } from "zod";

/**
 * Validação do formulário de login (`AdminLoginForm`).
 */
export const signInSchema = z.object({
  email: z
    .string({ error: "Informe seu e-mail." })
    .min(1, "Informe seu e-mail.")
    .email("Informe um e-mail válido."),
  password: z
    .string({ error: "Informe sua senha." })
    .min(6, "A senha deve ter pelo menos 6 caracteres."),
});

export type SignInInput = z.infer<typeof signInSchema>;

/**
 * Validação do corpo de `POST /api/auth/reset-request`.
 */
export const resetRequestSchema = z.object({
  email: z
    .string({ error: "Informe seu e-mail." })
    .min(1, "Informe seu e-mail.")
    .email("Informe um e-mail válido."),
});

export type ResetRequestInput = z.infer<typeof resetRequestSchema>;
