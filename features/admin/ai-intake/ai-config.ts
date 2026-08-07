import { z } from "zod";

import {
  PRODUCT_CONDITIONS,
  PRODUCT_GENDERS,
  SIZE_GROUPS,
  slugifyProductName,
} from "@/features/admin/product-constants";
import {
  emptyIntakeDraft,
  type GeneratePreviewInput,
  type IntakeDraftItem,
} from "@/features/admin/ai-intake/schemas";

export type AiKeyEnv = {
  OPENAI_API_KEY?: string;
  AI_GATEWAY_API_KEY?: string;
};

export function resolveAiApiKey(
  env: AiKeyEnv,
): { key: string; source: "openai" | "gateway" } | null {
  if (env.OPENAI_API_KEY) {
    return { key: env.OPENAI_API_KEY, source: "openai" };
  }
  if (env.AI_GATEWAY_API_KEY) {
    return { key: env.AI_GATEWAY_API_KEY, source: "gateway" };
  }
  return null;
}

export function isAiIntakeConfigured(env: AiKeyEnv): boolean {
  return resolveAiApiKey(env) !== null;
}

/** Build drafts without calling a provider (manual path). */
export function buildManualPreviewDrafts(
  input: GeneratePreviewInput,
): IntakeDraftItem[] {
  return input.items.map((item) =>
    emptyIntakeDraft({
      client_id: item.client_id,
      images: item.images,
      audio_note: item.audio_note ?? null,
    }),
  );
}

export const aiStructuredItemSchema = z.object({
  client_id: z.string(),
  name: z.string().optional().default(""),
  description: z.string().nullable().optional().default(null),
  price: z.number().nullable().optional().default(null),
  brand: z.string().nullable().optional().default(null),
  size_label: z.string().optional().default(""),
  size_group: z.enum(SIZE_GROUPS).optional().default("2_3a"),
  gender: z.enum(PRODUCT_GENDERS).optional().default("unissex"),
  condition: z.enum(PRODUCT_CONDITIONS).optional().default("seminovo"),
  tags: z.array(z.string()).optional().default([]),
});

export function mergeAiDraft(
  source: GeneratePreviewInput["items"][number],
  ai: z.infer<typeof aiStructuredItemSchema>,
): IntakeDraftItem {
  const name = ai.name?.trim() ?? "";
  return {
    ...emptyIntakeDraft({
      client_id: source.client_id,
      images: source.images,
      audio_note: source.audio_note ?? null,
    }),
    name,
    slug: name ? slugifyProductName(name) : "",
    description: ai.description ?? source.audio_note ?? null,
    price: ai.price,
    brand: ai.brand,
    size_label: ai.size_label ?? "",
    size_group: ai.size_group ?? "2_3a",
    gender: ai.gender ?? "unissex",
    condition: ai.condition ?? "seminovo",
    tags: ai.tags ?? [],
  };
}
