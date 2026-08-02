"use server";

import { redirect } from "next/navigation";

import { signInSchema } from "@/features/admin/schemas";
import type { SignInActionState } from "@/features/admin/sign-in-state";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

/**
 * Mensagem genérica para toda falha de login — credencial errada, usuário
 * inexistente no Supabase Auth, ou usuário existente mas sem linha ativa em
 * `admins`. Nunca revelar qual dessas causas ocorreu (evita enumeração de
 * contas admin).
 */
const GENERIC_ERROR = "E-mail ou senha inválidos.";

/**
 * Server action do formulário de login (`AdminLoginForm`). Autentica via
 * Supabase Auth (cliente ligado a cookies, para gravar a sessão no browser)
 * e confere, via `createServiceSupabaseClient()`, que existe uma linha ativa
 * em `admins` vinculada ao usuário antes de considerar o login válido — a
 * tabela não tem policy de RLS para `authenticated`, só `service_role` (ver
 * docs/04-data-model.md e docs/09-decisions.md D19).
 */
export async function signInAction(
  _prevState: SignInActionState,
  formData: FormData,
): Promise<SignInActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: GENERIC_ERROR };
  }

  const supabase = await createServerSupabaseClient();

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword(
    parsed.data,
  );

  if (signInError || !signInData.user) {
    return { error: GENERIC_ERROR };
  }

  const serviceClient = createServiceSupabaseClient();

  const { data: adminRow } = await serviceClient
    .from("admins")
    .select("*")
    .eq("auth_user_id", signInData.user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!adminRow) {
    // Autenticou no Supabase Auth, mas não é um admin ativo — encerra a
    // sessão para não deixar um usuário não autorizado logado no browser.
    await supabase.auth.signOut();
    return { error: GENERIC_ERROR };
  }

  redirect("/admin");
}
