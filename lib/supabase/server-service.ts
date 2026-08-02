import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Cliente Supabase com a service role key — ignora RLS.
 *
 * Usar **apenas** em server actions e rotas de API que precisam de acesso
 * privilegiado (webhooks, CRUD do admin, sincronização de pagamento). Nunca
 * importar este módulo em código que roda no browser.
 */
export function createServiceSupabaseClient() {
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
