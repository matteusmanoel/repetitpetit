import { z } from "zod";

/**
 * Typed, validated environment variables.
 * See docs/07-setup.md and .env.example for the full list.
 *
 * Only NEXT_PUBLIC_* vars are available in the browser; server-only secrets
 * (service role key, Mercado Pago) are validated lazily on the server.
 */
const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_STORE_NAME: z.string().min(1).default("Repeti Petit"),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_STORE_WHATSAPP: z.string().optional(),
});

export const env = clientSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_STORE_NAME: process.env.NEXT_PUBLIC_STORE_NAME,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_STORE_WHATSAPP: process.env.NEXT_PUBLIC_STORE_WHATSAPP,
});

/** Server-only secret; throws if accessed without being configured. */
export function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return key;
}
