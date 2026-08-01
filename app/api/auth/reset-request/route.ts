import { NextResponse } from "next/server";

import { resetRequestSchema } from "@/features/admin/schemas";
import { env } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Resposta idêntica em todos os cenários (payload inválido, e-mail
 * inexistente, ou envio real) — evita revelar se um e-mail tem conta admin
 * (enumeração de contas).
 */
function genericResponse() {
  return NextResponse.json({
    message: "Se o e-mail existir, enviamos um link de redefinição de senha.",
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = resetRequestSchema.safeParse(body);

  if (!parsed.success) {
    return genericResponse();
  }

  const supabase = await createServerSupabaseClient();

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/reset`,
  });

  return genericResponse();
}
