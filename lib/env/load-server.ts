import { z } from "zod";

import { publicEnvSchema, type PublicEnv } from "@/lib/env/public";

/**
 * Secrets e vars só de servidor (schema puro — sem `server-only` para testes).
 * O barrel `lib/env/server.ts` é que impede import no browser.
 */
const serverOnlySchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string({ error: "SUPABASE_SERVICE_ROLE_KEY é obrigatório." })
    .min(1, "SUPABASE_SERVICE_ROLE_KEY é obrigatório."),
  MERCADOPAGO_ACCESS_TOKEN: z.string().min(1).optional(),
  MERCADOPAGO_WEBHOOK_SECRET: z.string().min(1).optional(),
  /** Optional — SO-04 AI intake multimodal. Missing → manual editable preview. */
  OPENAI_API_KEY: z.string().min(1).optional(),
  /** Optional Vercel AI Gateway / alternate provider key (same role as OPENAI). */
  AI_GATEWAY_API_KEY: z.string().min(1).optional(),
  /** Optional local ESC/POS bridge base URL (store machine). Missing → offline. */
  THERMAL_PRINT_BRIDGE_URL: z.string().url().optional(),
});

const envSchema = publicEnvSchema.extend(serverOnlySchema.shape);

export type Env = z.infer<typeof envSchema>;

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(raiz)"}: ${issue.message}`)
    .join("\n");
}

/**
 * Valida env completo (público + secrets).
 */
export function loadEnv(raw: Record<string, string | undefined>): Env {
  const parsed = envSchema.safeParse(raw);

  if (!parsed.success) {
    throw new Error(
      `Variáveis de ambiente inválidas ou ausentes:\n${formatIssues(parsed.error)}\n\n` +
        "Verifique seu .env.local (veja .env.example para a lista completa).",
    );
  }

  return parsed.data;
}

export type { PublicEnv };
