import { z } from "zod";

/**
 * Env vars sempre obrigatórias, em qualquer ambiente (docs/07-setup.md, coluna "Sempre").
 */
const requiredSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string({ error: "NEXT_PUBLIC_SUPABASE_URL é obrigatório." })
    .url("NEXT_PUBLIC_SUPABASE_URL deve ser uma URL válida do projeto Supabase."),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string({ error: "NEXT_PUBLIC_SUPABASE_ANON_KEY é obrigatório." })
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY é obrigatório."),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string({ error: "SUPABASE_SERVICE_ROLE_KEY é obrigatório." })
    .min(1, "SUPABASE_SERVICE_ROLE_KEY é obrigatório."),
  NEXT_PUBLIC_SITE_URL: z
    .string({ error: "NEXT_PUBLIC_SITE_URL é obrigatório." })
    .url("NEXT_PUBLIC_SITE_URL deve ser uma URL válida (ex.: https://repetipetit.com.br)."),
  NEXT_PUBLIC_STORE_NAME: z
    .string({ error: "NEXT_PUBLIC_STORE_NAME é obrigatório." })
    .min(1, "NEXT_PUBLIC_STORE_NAME é obrigatório."),
});

/**
 * Env vars usadas apenas por features específicas (pagamento, suporte via WhatsApp).
 * Ausentes em dev/scaffold é aceitável; as features que dependem delas devem validar
 * a presença antes de usar (ex.: `features/payments`).
 */
const optionalSchema = z.object({
  MERCADOPAGO_ACCESS_TOKEN: z.string().min(1).optional(),
  NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY: z.string().min(1).optional(),
  MERCADOPAGO_WEBHOOK_SECRET: z.string().min(1).optional(),
  NEXT_PUBLIC_STORE_WHATSAPP: z
    .string()
    .regex(
      /^\d{10,15}$/,
      "NEXT_PUBLIC_STORE_WHATSAPP deve conter apenas números com DDI e DDD (ex.: 554599999999).",
    )
    .optional(),
});

const envSchema = requiredSchema.extend(optionalSchema.shape);

export type Env = z.infer<typeof envSchema>;

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(raiz)"}: ${issue.message}`)
    .join("\n");
}

/**
 * Valida as variáveis de ambiente com Zod. Lança um erro descritivo (em vez de
 * deixar o app quebrar silenciosamente mais tarde) quando alguma variável
 * obrigatória está ausente ou em formato inválido.
 *
 * Recebe `raw` explicitamente (em vez de ler `process.env` internamente) para
 * que a lógica de validação seja testável sem depender do ambiente do processo.
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

// Nunca acessar `process.env` fora deste arquivo — ver docs/06-agent-playbook.md.
export const env = loadEnv(process.env);
