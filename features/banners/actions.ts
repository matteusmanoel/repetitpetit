"use server";

import { revalidatePath } from "next/cache";

import { requireAdminSession } from "@/features/admin/session";
import type { BannerActionState } from "@/features/banners/action-state";
import { parseBannerFormData } from "@/features/banners/schemas";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

function firstFieldError(
  error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } },
): BannerActionState["fieldErrors"] {
  const flat = error.flatten().fieldErrors;
  const fieldErrors: BannerActionState["fieldErrors"] = {};

  for (const [key, messages] of Object.entries(flat)) {
    if (messages?.[0]) {
      fieldErrors[key as keyof NonNullable<BannerActionState["fieldErrors"]>] =
        messages[0];
    }
  }

  return fieldErrors;
}

export async function createBannerAction(
  _prev: BannerActionState,
  formData: FormData,
): Promise<BannerActionState> {
  await requireAdminSession();

  const parsed = parseBannerFormData(formData);

  if (!parsed.success) {
    return {
      error: "Revise os campos destacados.",
      fieldErrors: firstFieldError(parsed.error),
    };
  }

  const supabase = createServiceSupabaseClient();
  const { error } = await supabase.from("banners").insert(parsed.data);

  if (error) {
    return { error: `Não foi possível criar o banner: ${error.message}` };
  }

  revalidatePath("/");
  revalidatePath("/admin/banners");
  return { success: true };
}

export async function updateBannerAction(
  id: string,
  _prev: BannerActionState,
  formData: FormData,
): Promise<BannerActionState> {
  await requireAdminSession();

  const parsed = parseBannerFormData(formData);

  if (!parsed.success) {
    return {
      error: "Revise os campos destacados.",
      fieldErrors: firstFieldError(parsed.error),
    };
  }

  const supabase = createServiceSupabaseClient();
  const { error } = await supabase
    .from("banners")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { error: `Não foi possível atualizar o banner: ${error.message}` };
  }

  revalidatePath("/");
  revalidatePath("/admin/banners");
  revalidatePath(`/admin/banners/${id}`);
  return { success: true };
}

export async function deleteBannerAction(id: string): Promise<void> {
  await requireAdminSession();

  const supabase = createServiceSupabaseClient();
  const { error } = await supabase.from("banners").delete().eq("id", id);

  if (error) {
    throw new Error(`Não foi possível excluir o banner: ${error.message}`);
  }

  revalidatePath("/");
  revalidatePath("/admin/banners");
}
