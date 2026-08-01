import "server-only";

import type { Database } from "@/lib/supabase/types";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

export type Banner = Database["public"]["Tables"]["banners"]["Row"];

/**
 * Lista todos os banners para o admin (ativos e inativos),
 * ordenados por `sort_order` — o mesmo critério que a home pública
 * usará filtrando `is_active = true` (ticket T09).
 */
export async function listBanners(): Promise<Banner[]> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from("banners")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Falha ao listar banners: ${error.message}`);
  }

  return data ?? [];
}

export async function getBannerById(id: string): Promise<Banner | null> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from("banners")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao buscar banner: ${error.message}`);
  }

  return data;
}
