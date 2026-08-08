"use server";

import { redirect } from "next/navigation";

import {
  BUYER_DEFAULT_NEXT_PATH,
  sanitizeBuyerNextPath,
} from "@/features/buyer/constants";
import type { MagicLinkActionState } from "@/features/buyer/magic-link-state";
import { buyerMagicLinkSchema } from "@/features/buyer/schemas";
import { env } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

/**
 * Envia magic link Supabase Auth para comprador (D103).
 * Não usa `requireAdminSession`. E-mails de admin ativo não recebem OTP
 * (evita bypass de senha do painel) — resposta idêntica por privacidade.
 */
export async function sendBuyerMagicLinkAction(
  _prev: MagicLinkActionState,
  formData: FormData,
): Promise<MagicLinkActionState> {
  const parsed = buyerMagicLinkSchema.safeParse({
    email: formData.get("email"),
    next: formData.get("next") || undefined,
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Dados inválidos.";
    return { ok: false, error: first, sent: false };
  }

  const email = parsed.data.email;
  const next = sanitizeBuyerNextPath(
    parsed.data.next ?? BUYER_DEFAULT_NEXT_PATH,
  );

  const service = createServiceSupabaseClient();
  const { data: adminRow } = await service
    .from("admins")
    .select("id")
    .eq("email", email)
    .eq("is_active", true)
    .maybeSingle();

  if (adminRow) {
    // Silent no-op: admin must use /admin/login + password.
    return { ok: true, error: null, sent: true };
  }

  const siteUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const redirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`;

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: true,
      data: { app_role: "buyer" },
    },
  });

  if (error) {
    console.error("Falha ao enviar magic link comprador:", error);
    return {
      ok: false,
      error: "Não foi possível enviar o link agora. Tente de novo em instantes.",
      sent: false,
    };
  }

  return { ok: true, error: null, sent: true };
}

export async function signOutBuyerAction(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
}

/** Sign out buyer session and return to soft entry. */
export async function signOutBuyerToEntrarAction(): Promise<void> {
  await signOutBuyerAction();
  redirect("/entrar");
}
