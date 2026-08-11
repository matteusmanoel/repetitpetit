"use server";

import { revalidatePath } from "next/cache";

import {
  generateAiPreviewDrafts,
  isAiIntakeConfigured,
  isPriceOnlyEditTranscript,
} from "@/features/admin/ai-intake/ai-provider";
import {
  applyCategoryMatchToDraft,
  listBrandCandidates,
  normalizeBrandName,
} from "@/features/admin/ai-intake/category-match";
import { buildMockAudioFieldSuggestions } from "@/features/admin/product-audio-fields";
import type { ProductAudioFieldSuggestion } from "@/features/admin/product-audio-fields";
import { coerceProductSizeLabel } from "@/features/admin/product-constants";
import {
  getAdminProduct,
  listActiveCategories,
} from "@/features/admin/product-queries";
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

function normalizeKeyName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

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
 * Áudio → campos: STT+LLM quando há `audio_data_url` (mesmo pipeline do intake).
 * Com `current`: modo edição — patch sobre a peça; falha NÃO troca por mock.
 */
export async function processProductAudioAction(input: {
  audioNote?: string | null;
  audio_data_url?: string | null;
  imageUrls?: string[];
  current?: ProductAudioFieldSuggestion | null;
}): Promise<ProcessProductAudioResult> {
  await requireAdminSession();

  const audioDataUrl = input.audio_data_url?.trim() || null;
  const audioNote = audioDataUrl
    ? "[áudio gravado]"
    : input.audioNote?.trim() || null;
  const current = input.current ?? null;

  const keepCurrentOrMock = (warning: string): ProcessProductAudioResult => {
    if (current) {
      return {
        ok: true,
        fields: current,
        mode: "manual",
        warning,
      };
    }
    return {
      ok: true,
      fields: buildMockAudioFieldSuggestions(audioNote),
      mode: "manual",
      warning,
    };
  };

  const images = (input.imageUrls ?? [])
    .filter(Boolean)
    .slice(0, 8)
    .map((image_url) => ({ image_url, alt_text: null as string | null }));

  const imagesForPipeline =
    images.length > 0
      ? images
      : [
          {
            image_url: "https://placehold.co/600x800/e4e4e7/e4e4e7.png",
            alt_text: null,
          },
        ];

  if (!isAiIntakeConfigured(env)) {
    return keepCurrentOrMock(
      "IA não configurada — campos sugeridos (fallback). Revise antes de salvar.",
    );
  }

  if (!audioDataUrl) {
    return keepCurrentOrMock(
      "Sem áudio capturado — grave de novo e processe para preencher com IA.",
    );
  }

  try {
    const categories = await listActiveCategories();
    const categoryNames = categories
      .filter((c) => c.slug !== "teste" && normalizeKeyName(c.name) !== "teste")
      .map((c) => c.name);

    const categoryName =
      current?.category_name ??
      (current?.category_id
        ? (categories.find((c) => c.id === current.category_id)?.name ?? null)
        : null);

    const result = await generateAiPreviewDrafts({
      env,
      input: {
        items: [
          {
            client_id: "dialog-1",
            images: imagesForPipeline,
            audio_data_url: audioDataUrl,
            audio_note: audioNote,
          },
        ],
      },
      domainContext: {
        categoryNames,
        brandNames: listBrandCandidates(),
      },
      editContext: current
        ? {
            name: current.name,
            description: current.description || null,
            price: current.price > 0 ? current.price : null,
            brand: current.brand || null,
            size_label: current.size_label || null,
            size_group: current.size_group || null,
            gender: current.gender || null,
            condition: current.condition || null,
            category_name: categoryName,
            tags: current.tags ?? [],
          }
        : undefined,
    });

    const rawDraft = result.drafts[0];
    if (!rawDraft || result.mode === "manual" || !rawDraft.name.trim()) {
      // Em edição: se a IA falhou mas o STT pediu só preço, ainda assim não mockar.
      // Se há draft parcial com preço e current, mesclar.
      if (current && rawDraft) {
        const priceNum =
          typeof rawDraft.price === "number"
            ? rawDraft.price
            : Number(rawDraft.price ?? NaN);
        if (Number.isFinite(priceNum) && priceNum > 0) {
          return {
            ok: true,
            mode: "ai",
            warning: result.warning,
            fields: {
              ...current,
              price: priceNum,
            },
          };
        }
      }
      return keepCurrentOrMock(
        result.warning ??
          "IA não preencheu os campos — mantidos os valores atuais. Tente gravar de novo.",
      );
    }

    const matched = applyCategoryMatchToDraft(
      {
        ...rawDraft,
        brand: normalizeBrandName(rawDraft.brand),
      },
      categories,
    );

    const priceNum =
      typeof matched.price === "number"
        ? matched.price
        : Number(matched.price ?? NaN);

    const fromAi: ProductAudioFieldSuggestion = {
      name: matched.name,
      description: matched.description?.trim() || "",
      price: Number.isFinite(priceNum) && priceNum > 0 ? priceNum : 0,
      brand: matched.brand?.trim() || "",
      size_label: coerceProductSizeLabel(matched.size_label),
      size_group: matched.size_group,
      gender: matched.gender ?? "unissex",
      condition: matched.condition ?? "seminovo",
      category_id: matched.category_id,
      category_name: matched.category_name ?? null,
      tags: matched.tags ?? [],
    };

    if (!current) {
      return {
        ok: true,
        mode: "ai",
        warning: result.warning,
        fields: fromAi,
      };
    }

    const transcript =
      result.debug?.transcripts?.find((t) => t.client_id === "dialog-1")
        ?.transcript ?? null;

    // Transcrição só de preço → altera só o preço (evita inventar nome/marca).
    if (isPriceOnlyEditTranscript(transcript) && fromAi.price > 0) {
      return {
        ok: true,
        mode: "ai",
        warning: result.warning,
        fields: {
          ...current,
          price: fromAi.price,
        },
      };
    }

    // Patch: campos vazios/null na IA preservam o atual.
    const merged: ProductAudioFieldSuggestion = {
      name: fromAi.name.trim() || current.name,
      description: fromAi.description.trim() || current.description,
      price: fromAi.price > 0 ? fromAi.price : current.price,
      brand: fromAi.brand.trim() || current.brand,
      size_label: fromAi.size_label || current.size_label,
      size_group: fromAi.size_group || current.size_group,
      gender: fromAi.gender || current.gender,
      condition: fromAi.condition || current.condition,
      category_id: fromAi.category_id || current.category_id || null,
      category_name: fromAi.category_name || current.category_name || null,
      tags:
        fromAi.tags && fromAi.tags.length > 0 ? fromAi.tags : current.tags ?? [],
    };

    return {
      ok: true,
      mode: "ai",
      warning: result.warning,
      fields: merged,
    };
  } catch (error) {
    return keepCurrentOrMock(
      error instanceof Error
        ? `Falha na IA (${error.message}). Valores atuais mantidos.`
        : "Falha na IA. Valores atuais mantidos.",
    );
  }
}
