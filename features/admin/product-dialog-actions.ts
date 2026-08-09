"use server";

import { revalidatePath } from "next/cache";

import {
  generateAiPreviewDrafts,
  isAiIntakeConfigured,
} from "@/features/admin/ai-intake/ai-provider";
import { buildMockAudioFieldSuggestions } from "@/features/admin/product-audio-fields";
import type { ProductAudioFieldSuggestion } from "@/features/admin/product-audio-fields";
import { coerceProductSizeLabel } from "@/features/admin/product-constants";
import { getAdminProduct } from "@/features/admin/product-queries";
import type {
  CategoryOption,
  ProductWithImages,
} from "@/features/admin/product-types";
import { requireAdminSession } from "@/features/admin/session";
import { env } from "@/lib/env";
import { slugify } from "@/lib/slug";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

export type LoadProductDialogResult =
  | { ok: true; product: ProductWithImages }
  | { ok: false; error: string };

export type CreateCategoryInlineResult =
  | { ok: true; category: CategoryOption }
  | { ok: false; error: string };

export type ProcessProductAudioResult =
  | {
      ok: true;
      fields: ProductAudioFieldSuggestion;
      mode: "ai" | "manual";
      warning?: string;
    }
  | { ok: false; error: string };

/** Carrega peça + imagens para o dialog de edição (SP-4). */
export async function loadProductForDialogAction(
  productId: string,
): Promise<LoadProductDialogResult> {
  await requireAdminSession();

  if (!productId) {
    return { ok: false, error: "Produto inválido." };
  }

  try {
    const product = await getAdminProduct(productId);
    if (!product) {
      return { ok: false, error: "Produto não encontrado." };
    }
    return { ok: true, product };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o produto.",
    };
  }
}

/**
 * Cria categoria ativa inline no dialog (sem redirect para /admin/categorias).
 */
export async function createCategoryInlineAction(
  name: string,
): Promise<CreateCategoryInlineResult> {
  await requireAdminSession();

  const trimmed = name.trim();
  if (trimmed.length < 1) {
    return { ok: false, error: "Informe o nome da categoria." };
  }
  if (trimmed.length > 120) {
    return { ok: false, error: "O nome deve ter no máximo 120 caracteres." };
  }

  const slug = slugify(trimmed);
  if (!slug) {
    return { ok: false, error: "Nome inválido para gerar o slug." };
  }

  const supabase = createServiceSupabaseClient();

  const { data: maxRow } = await supabase
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = (maxRow?.sort_order ?? 0) + 1;

  const { data, error } = await supabase
    .from("categories")
    .insert({
      name: trimmed,
      slug,
      description: null,
      image_url: null,
      is_active: true,
      sort_order: sortOrder,
    })
    .select("id, name, slug")
    .single();

  if (error) {
    if (error.code === "23505" || error.message.toLowerCase().includes("duplicate")) {
      return { ok: false, error: "Já existe uma categoria com este nome/slug." };
    }
    return { ok: false, error: `Não foi possível criar a categoria: ${error.message}` };
  }

  revalidatePath("/admin/produtos");
  revalidatePath("/admin/categorias");
  revalidatePath("/");

  return { ok: true, category: data };
}

/**
 * Áudio → campos: usa IA quando configurada (mesmo gate do intake);
 * senão fallback mock para edição manual.
 */
export async function processProductAudioAction(input: {
  audioNote?: string | null;
  imageUrls?: string[];
}): Promise<ProcessProductAudioResult> {
  await requireAdminSession();

  const audioNote = input.audioNote?.trim() || null;
  const images = (input.imageUrls ?? [])
    .filter(Boolean)
    .slice(0, 4)
    .map((image_url) => ({ image_url, alt_text: null as string | null }));

  if (!isAiIntakeConfigured(env)) {
    return {
      ok: true,
      fields: buildMockAudioFieldSuggestions(audioNote),
      mode: "manual",
      warning:
        "IA não configurada — campos sugeridos (fallback). Revise antes de salvar.",
    };
  }

  try {
    const result = await generateAiPreviewDrafts({
      env,
      input: {
        items: [
          {
            client_id: "dialog-1",
            images,
            audio_note: audioNote,
          },
        ],
      },
    });

    const draft = result.drafts[0];
    if (!draft || result.mode === "manual" || !draft.name.trim()) {
      return {
        ok: true,
        fields: buildMockAudioFieldSuggestions(audioNote),
        mode: "manual",
        warning:
          result.warning ??
          "IA não preencheu os campos — use o fallback e edite manualmente.",
      };
    }

    const priceNum =
      typeof draft.price === "number"
        ? draft.price
        : Number(draft.price ?? NaN);

    return {
      ok: true,
      mode: "ai",
      warning: result.warning,
      fields: {
        name: draft.name,
        description:
          draft.description?.trim() ||
          buildMockAudioFieldSuggestions(audioNote).description,
        price: Number.isFinite(priceNum) && priceNum > 0 ? priceNum : 89,
        brand: draft.brand?.trim() || "Hering Kids",
        size_label: coerceProductSizeLabel(draft.size_label),
        size_group: draft.size_group,
        gender: draft.gender,
        condition: draft.condition,
      },
    };
  } catch (error) {
    return {
      ok: true,
      fields: buildMockAudioFieldSuggestions(audioNote),
      mode: "manual",
      warning:
        error instanceof Error
          ? `Falha na IA (${error.message}). Fallback aplicado.`
          : "Falha na IA. Fallback aplicado.",
    };
  }
}
