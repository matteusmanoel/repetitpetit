import { createBrowserClient } from "@supabase/ssr";

import { publicEnv } from "@/lib/env/public";
import type { Database } from "@/lib/supabase/types";

/**
 * Cliente Supabase para uso em Client Components (browser).
 * Usa só `publicEnv` — nunca `lib/env` (server-only + service role).
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
