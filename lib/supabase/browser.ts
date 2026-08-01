import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/lib/env";

/**
 * Cliente Supabase para uso em Client Components (browser).
 *
 * TODO(ticket 02): trocar o generic por `Database` assim que os tipos forem
 * gerados via `generate_typescript_types` (MCP Supabase). Até lá, o cliente
 * fica sem tipagem de schema (`any` implícito da lib).
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
