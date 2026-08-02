import "server-only";

import type { Database } from "@/lib/supabase/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

export type Category = Database["public"]["Tables"]["categories"]["Row"];

export type ActiveCategory = Pick<
  Category,
  "id" | "name" | "slug" | "description" | "image_url" | "sort_order"
>;

/**
 * Lista todas as categorias para o admin (ativas e inativas),
 * ordenadas por `sort_order` — o mesmo critério que a home pública
 * usa filtrando `is_active = true`.
 */
export async function listCategories(): Promise<Category[]> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Falha ao listar categorias: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Categorias ativas para a home pública (RLS: is_active = true).
 */
export async function listActiveCategories(): Promise<ActiveCategory[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, description, image_url, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Falha ao carregar categorias: ${error.message}`);
  }

  return data ?? [];
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao buscar categoria: ${error.message}`);
  }

  return data;
}
