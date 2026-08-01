"use server";

import { LEAD_SOURCE_POPUP_FIRST_SCROLL } from "@/features/leads/constants";
import { leadEmailSchema } from "@/features/leads/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SubmitLeadResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Insere e-mail em `leads` com `source = popup_first_scroll`.
 * Usa o cliente anon (RLS: INSERT permitido) — sem cupom, sem service role.
 */
export async function submitLeadAction(
  raw: unknown,
): Promise<SubmitLeadResult> {
  const parsed = leadEmailSchema.safeParse(raw);

  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "E-mail inválido.";
    return { success: false, error: first };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("leads").insert({
    email: parsed.data.email,
    source: LEAD_SOURCE_POPUP_FIRST_SCROLL,
  });

  if (error) {
    // Unique index em email — reenvio do mesmo endereço conta como sucesso.
    if (error.code === "23505") {
      return { success: true };
    }

    console.error("Falha ao inserir lead:", error);
    return {
      success: false,
      error: "Não foi possível salvar seu e-mail. Tente novamente.",
    };
  }

  return { success: true };
}
