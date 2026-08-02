import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Cliente Supabase para uso em Client Components (browser).
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
