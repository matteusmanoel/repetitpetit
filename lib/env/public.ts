import { z } from "zod";

/** Canonical storefront / label brand name (legal/trade: Repeti Petit). */
export const STORE_DISPLAY_NAME = "Repeti Petit";

/**
 * Normaliza o nome da loja no load de env (D100; supersede D93/D98/D99).
 * Marca real = "Repeti Petit". Variantes com t extra ou Petite → canônico.
 */
export function normalizeStoreName(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  // Repeti(t) Petit(e) → Repeti Petit
  if (/^Repetit?\s+Petite?$/i.test(trimmed)) {
    return STORE_DISPLAY_NAME;
  }
  return trimmed;
}

/**
 * Env vars públicas (`NEXT_PUBLIC_*`) — seguras para Client Components.
 * Nunca incluir secrets de servidor aqui (service role, MP access token, etc.).
 */
const publicRequiredSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string({ error: "NEXT_PUBLIC_SUPABASE_URL é obrigatório." })
    .url("NEXT_PUBLIC_SUPABASE_URL deve ser uma URL válida do projeto Supabase."),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string({ error: "NEXT_PUBLIC_SUPABASE_ANON_KEY é obrigatório." })
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY é obrigatório."),
  NEXT_PUBLIC_SITE_URL: z
    .string({ error: "NEXT_PUBLIC_SITE_URL é obrigatório." })
    .url(
      "NEXT_PUBLIC_SITE_URL deve ser uma URL válida (ex.: https://repetipetit.com.br).",
    ),
  NEXT_PUBLIC_STORE_NAME: z
    .string({ error: "NEXT_PUBLIC_STORE_NAME é obrigatório." })
    .min(1, "NEXT_PUBLIC_STORE_NAME é obrigatório.")
    .transform(normalizeStoreName),
});

const publicOptionalSchema = z.object({
  NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_STORE_WHATSAPP: z
    .string()
    .regex(
      /^\d{10,15}$/,
      "NEXT_PUBLIC_STORE_WHATSAPP deve conter apenas números com DDI e DDD (ex.: 554599999999).",
    )
    .optional(),
});

export const publicEnvSchema = publicRequiredSchema.extend(
  publicOptionalSchema.shape,
);

export type PublicEnv = z.infer<typeof publicEnvSchema>;

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(raiz)"}: ${issue.message}`)
    .join("\n");
}

/**
 * Valida só variáveis públicas. Usado no browser e no middleware (sem
 * `SUPABASE_SERVICE_ROLE_KEY`).
 */
export function loadPublicEnv(
  raw: Record<string, string | undefined>,
): PublicEnv {
  const parsed = publicEnvSchema.safeParse(raw);

  if (!parsed.success) {
    throw new Error(
      `Variáveis de ambiente públicas inválidas ou ausentes:\n${formatIssues(parsed.error)}\n\n` +
        "Verifique NEXT_PUBLIC_* no Vercel / .env.local (veja .env.example).",
    );
  }

  return parsed.data;
}

/**
 * Acesso tipado às vars públicas. Seguro para Client Components.
 *
 * Next.js embute `NEXT_PUBLIC_*` no bundle no build — leia-as por chave
 * (não passe `process.env` inteiro) para o inlining funcionar no client.
 */
export const publicEnv: PublicEnv = loadPublicEnv({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_STORE_NAME: process.env.NEXT_PUBLIC_STORE_NAME,
  NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY:
    process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY,
  NEXT_PUBLIC_STORE_WHATSAPP: process.env.NEXT_PUBLIC_STORE_WHATSAPP,
});
