import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { publicEnv } from "@/lib/env/public";
import type { Database } from "@/lib/supabase/types";

/**
 * Atualiza (refresh) a sessão Supabase Auth a partir dos cookies da request e
 * propaga os cookies renovados para a response.
 *
 * Server Components não conseguem escrever cookies (`server.ts` engole o
 * `setAll` em silêncio nesse contexto), então sem isto o access token expirado
 * nunca seria renovado entre requests — o middleware é o único lugar do App
 * Router que pode ler *e* escrever cookies em toda navegação.
 *
 * Não decide autorização (isso é responsabilidade de `requireAdminSession()`
 * em `features/admin/session.ts`) — apenas mantém a sessão fresca.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Não adicionar lógica entre `createServerClient` e `getUser()` — o
  // Supabase precisa desta chamada para decidir se renova o token.
  await supabase.auth.getUser();

  return supabaseResponse;
}
