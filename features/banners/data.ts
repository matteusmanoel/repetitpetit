import "server-only";

import type { Database } from "@/lib/supabase/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

export type Banner = Database["public"]["Tables"]["banners"]["Row"];

export type ActiveBanner = Pick<
  Banner,
  | "id"
  | "title"
  | "subtitle"
  | "image_url"
  | "cta_label"
  | "cta_href"
  | "sort_order"
>;

/**
 * Lista todos os banners para o admin (ativos e inativos),
 * ordenados por `sort_order` — o mesmo critério que a home pública
 * usa filtrando `is_active = true`.
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

/**
 * Banners ativos para a home pública (RLS: is_active = true).
 */
export async function listActiveBanners(): Promise<ActiveBanner[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("banners")
    .select("id, title, subtitle, image_url, cta_label, cta_href, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Falha ao carregar banners: ${error.message}`);
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
