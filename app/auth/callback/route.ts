import { NextResponse } from "next/server";

import { sanitizeBuyerNextPath } from "@/features/buyer/constants";
import { mergeBuyerSessionAfterAuth } from "@/features/buyer/merge-buyer-session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

/**
 * OAuth/OTP callback for buyer magic link (SO-03).
 * Exchanges `code` → session cookies, merges anonymous hold by e-mail,
 * then redirects to `next` (default `/sacolinha`). Never opens admin gates.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = sanitizeBuyerNextPath(url.searchParams.get("next"));
  const origin = url.origin;

  if (!code) {
    return NextResponse.redirect(
      `${origin}/entrar?erro=link&next=${encodeURIComponent(next)}`,
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    console.error("Buyer magic-link exchange failed:", error);
    return NextResponse.redirect(
      `${origin}/entrar?erro=link&next=${encodeURIComponent(next)}`,
    );
  }

  // Admin accounts must not use buyer OTP as a password bypass.
  const service = createServiceSupabaseClient();
  const { data: adminRow } = await service
    .from("admins")
    .select("id")
    .eq("auth_user_id", data.user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (adminRow) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/admin/login`);
  }

  await mergeBuyerSessionAfterAuth({
    authUserId: data.user.id,
    email: data.user.email,
  });

  return NextResponse.redirect(`${origin}${next}`);
}
