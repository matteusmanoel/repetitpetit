import "server-only";

import { redirect } from "next/navigation";

import {
  resolveAdminSession,
  type AdminRow,
  type AdminSession,
} from "@/features/admin/resolve-admin-session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

export type { AdminRow, AdminSession };
export { resolveAdminSession };

/**
 * Busca a sessão do admin atual (usuário Supabase Auth + linha em `admins`).
 * Não redireciona — usar `requireAdminSession()` em rotas/actions que devem
 * bloquear o acesso quando não há sessão válida.
 *
 * A leitura de `admins` usa `createServiceSupabaseClient()` (service role) —
 * a policy de RLS da tabela (docs/04-data-model.md, "Postura de RLS") só
 * concede acesso a `service_role`; nem `anon` nem `authenticated` têm policy
 * nessa tabela, então o cliente de cookies (`createServerSupabaseClient()`)
 * sempre voltaria vazio aqui. Ver docs/09-decisions.md D19.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const supabase = await createServerSupabaseClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return null;
  }

  const serviceClient = createServiceSupabaseClient();

  const { data: adminRow } = await serviceClient
    .from("admins")
    .select("*")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();

  return resolveAdminSession(userData.user, adminRow ?? null);
}

/**
 * Helper server-only chamado em toda rota/action do admin
 * (docs/03-architecture.md — Auth strategy). Redireciona para
 * `/admin/login` quando não há sessão de admin válida; caso contrário,
 * retorna a sessão para a chamadora usar (ex.: exibir nome do admin).
 */
export async function requireAdminSession(): Promise<AdminSession> {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  return session;
}
