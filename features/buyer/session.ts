import "server-only";

import { redirect } from "next/navigation";

import {
  resolveBuyerSession,
  type BuyerSession,
  type CustomerRow,
} from "@/features/buyer/resolve-buyer-session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

export type { BuyerSession, CustomerRow };
export { resolveBuyerSession };

/**
 * Sessão do comprador: Auth user + linha em `customers.auth_user_id`.
 * Nunca usa `admins` / `requireAdminSession` (D103 / D119).
 *
 * Leitura de `customers` via service role — RLS de storefront não expõe
 * `auth_user_id` match de forma confiável para este gate (mesmo padrão D19).
 */
export async function getBuyerSession(): Promise<BuyerSession | null> {
  const supabase = await createServerSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return null;
  }

  const service = createServiceSupabaseClient();
  const { data: customerRow } = await service
    .from("customers")
    .select("*")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();

  return resolveBuyerSession(userData.user, customerRow ?? null);
}

/**
 * Bloqueia só a área agregada (Sacolinha). Pedido público NÃO usa isto (D103).
 */
export async function requireBuyerSession(
  nextPath = "/sacolinha",
): Promise<BuyerSession> {
  const session = await getBuyerSession();

  if (!session) {
    const next = encodeURIComponent(nextPath);
    redirect(`/entrar?next=${next}`);
  }

  return session;
}
