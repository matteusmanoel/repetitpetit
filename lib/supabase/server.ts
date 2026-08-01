import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

import { env } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

/**
 * Cliente Supabase para uso em Server Components, Server Actions e Route
 * Handlers. Lê/escreve a sessão via cookies — respeita RLS (não usar para
 * operações privilegiadas; ver `server-service.ts`).
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // `setAll` foi chamado a partir de um Server Component sem
            // contexto de resposta (ex.: renderização estática). O refresh
            // de sessão nesse caso é responsabilidade do middleware.
          }
        },
      },
    },
  );
}
