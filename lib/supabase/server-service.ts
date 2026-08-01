import { createClient } from "@supabase/supabase-js";
import { env, getServiceRoleKey } from "@/lib/env";

/**
 * Service-role Supabase client that bypasses RLS.
 * SERVER-ONLY: never import from a Client Component. Used by webhooks and
 * server actions that need elevated privileges.
 */
export function createSupabaseServiceClient() {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, getServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
