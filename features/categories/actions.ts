"use server";

import { revalidatePath } from "next/cache";

import { requireAdminSession } from "@/features/admin/session";
import type { CategoryActionState } from "@/features/categories/action-state";
import { parseCategoryFormData } from "@/features/categories/schemas";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

function firstFieldError(
  error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } },
): CategoryActionState["fieldErrors"] {
  const flat = error.flatten().fieldErrors;
  const fieldErrors: CategoryActionState["fieldErrors"] = {};

  for (const [key, messages] of Object.entries(flat)) {
    if (messages?.[0]) {
      fieldErrors[key as keyof NonNullable<CategoryActionState["fieldErrors"]>] =
        messages[0];
    }
  }

  return fieldErrors;
}

function isUniqueViolation(message: string): boolean {
  return message.toLowerCase().includes("duplicate") || message.includes("23505");
}

export async function createCategoryAction(
  _prev: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  await requireAdminSession();

  const parsed = parseCategoryFormData(formData);

  if (!parsed.success) {
    return {
      error: "Revise os campos destacados.",
      fieldErrors: firstFieldError(parsed.error),
    };
  }

  const supabase = createServiceSupabaseClient();
  const { error } = await supabase.from("categories").insert(parsed.data);

  if (error) {
    if (isUniqueViolation(error.message)) {
      return {
        error: "Já existe uma categoria com este slug.",
        fieldErrors: { slug: "Slug já em uso." },
      };
    }

    return { error: `Não foi possível criar a categoria: ${error.message}` };
  }

  revalidatePath("/");
  revalidatePath("/admin/categorias");
  return { success: true };
}

export async function updateCategoryAction(
  id: string,
  _prev: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  await requireAdminSession();

  const parsed = parseCategoryFormData(formData);

  if (!parsed.success) {
    return {
      error: "Revise os campos destacados.",
      fieldErrors: firstFieldError(parsed.error),
    };
  }

  const supabase = createServiceSupabaseClient();
  const { error } = await supabase
    .from("categories")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    if (isUniqueViolation(error.message)) {
      return {
        error: "Já existe uma categoria com este slug.",
        fieldErrors: { slug: "Slug já em uso." },
      };
    }

    return { error: `Não foi possível atualizar a categoria: ${error.message}` };
  }

  revalidatePath("/");
  revalidatePath("/admin/categorias");
  revalidatePath(`/admin/categorias/${id}`);
  return { success: true };
}

export async function deleteCategoryAction(id: string): Promise<void> {
  await requireAdminSession();

  const supabase = createServiceSupabaseClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) {
    throw new Error(`Não foi possível excluir a categoria: ${error.message}`);
  }

  revalidatePath("/");
  revalidatePath("/admin/categorias");
}
