import { z } from "zod";

import {
  MAX_INTAKE_PHOTOS,
  PREFERRED_METHODS,
} from "@/features/intake/constants";

/**
 * Schema do formulário de desapego (steps 2–3). Fotos são URLs já
 * enviadas via `POST /api/intake/upload`.
 */
export const intakeRequestSchema = z.object({
  fullName: z
    .string({ error: "Informe seu nome." })
    .trim()
    .min(2, "Informe seu nome completo.")
    .max(120, "Nome muito longo."),
  phone: z
    .string({ error: "Informe seu telefone." })
    .trim()
    .regex(
      /^\d{10,15}$/,
      "Informe o telefone com DDD, só números (ex.: 45999999999).",
    ),
  email: z
    .union([
      z.literal(""),
      z
        .string()
        .trim()
        .email("Informe um e-mail válido."),
    ])
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  itemCount: z.coerce
    .number({ error: "Informe a quantidade estimada." })
    .int("A quantidade deve ser um número inteiro.")
    .min(1, "Informe pelo menos 1 peça.")
    .max(999, "Quantidade máxima: 999."),
  description: z
    .string({ error: "Descreva as peças." })
    .trim()
    .min(10, "Conte um pouco mais sobre as peças (mín. 10 caracteres).")
    .max(2000, "Descrição muito longa (máx. 2000 caracteres)."),
  preferredMethod: z.enum(
    [
      PREFERRED_METHODS.entrega_na_loja,
      PREFERRED_METHODS.envio_pelos_correios,
    ],
    { error: "Escolha como prefere entregar as peças." },
  ),
  photoUrls: z
    .array(z.string().url("URL de foto inválida."))
    .max(MAX_INTAKE_PHOTOS, `Envie no máximo ${MAX_INTAKE_PHOTOS} fotos.`)
    .default([]),
});

export type IntakeRequestInput = z.infer<typeof intakeRequestSchema>;
