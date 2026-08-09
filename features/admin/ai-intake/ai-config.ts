import { z } from "zod";

import {
  PRODUCT_CONDITIONS,
  PRODUCT_GENDERS,
  PRODUCT_SIZE_LABELS,
  SIZE_GROUPS,
  coerceProductSizeLabel,
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

const PLACEHOLDER_AUDIO_NOTES = new Set([
  "[áudio gravado]",
  "[audio gravado]",
]);

/** True when audio_note is useful text (not the capture placeholder). */
export function isUsefulAudioNote(note: string | null | undefined): boolean {
  const trimmed = note?.trim();
  if (!trimmed) return false;
  return !PLACEHOLDER_AUDIO_NOTES.has(trimmed.toLowerCase());
}

export const aiStructuredItemSchema = z.object({
  client_id: z.string(),
  name: z.string().optional().default(""),
  description: z.string().nullable().optional().default(null),
  price: z.number().nullable().optional().default(null),
  brand: z.string().nullable().optional().default(null),
  category_name: z.string().nullable().optional().default(null),
  color: z.string().nullable().optional().default(null),
  attributes: z.array(z.string()).optional().default([]),
  size_label: z.string().nullable().optional().default(null),
  size_group: z.enum(SIZE_GROUPS).nullable().optional().default(null),
  gender: z.enum(PRODUCT_GENDERS).nullable().optional().default(null),
  condition: z.enum(PRODUCT_CONDITIONS).nullable().optional().default(null),
  tags: z.array(z.string()).optional().default([]),
});

export type AiStructuredItem = z.infer<typeof aiStructuredItemSchema>;

export function buildTagsFromAi(ai: AiStructuredItem): string[] {
  const tags = new Set<string>();
  for (const tag of ai.tags ?? []) {
    const t = tag.trim();
    if (t) tags.add(t);
  }
  if (ai.color?.trim()) tags.add(ai.color.trim().toLowerCase());
  for (const attr of ai.attributes ?? []) {
    const t = attr.trim();
    if (t) tags.add(t);
  }
  return Array.from(tags);
}

export function mergeAiDraft(
  source: GeneratePreviewInput["items"][number],
  ai: AiStructuredItem,
  transcript?: string | null,
): IntakeDraftItem {
  const name = ai.name?.trim() ?? "";
  const audioNote =
    (transcript && transcript.trim()) ||
    (isUsefulAudioNote(source.audio_note) ? source.audio_note : null) ||
    source.audio_note ||
    null;

  const sizeRaw = ai.size_label?.trim();
  const sizeLabel =
    sizeRaw && sizeRaw.length > 0
      ? coerceProductSizeLabel(sizeRaw)
      : "";

  return {
    ...emptyIntakeDraft({
      client_id: source.client_id,
      images: source.images,
      audio_note: audioNote,
    }),
    name,
    slug: name ? slugifyProductName(name) : "",
    description: ai.description?.trim() || transcript?.trim() || null,
    price: typeof ai.price === "number" && ai.price > 0 ? ai.price : null,
    brand: ai.brand?.trim() || null,
    category_name: ai.category_name?.trim() || null,
    size_label: sizeLabel,
    size_group: ai.size_group ?? "2_3a",
    gender: ai.gender ?? "unissex",
    condition: ai.condition ?? "seminovo",
    tags: buildTagsFromAi(ai),
  };
}

export function voiceExtractSystemPrompt(): string {
  return `Você extrai dados de peças de brechó infantil (Repeti Petit) a partir de TRANSCRIÇÕES de áudio.
Responda APENAS JSON válido: {"items":[{...}]}.
Campos por item: client_id (ecoar), name, description, price (número BRL ou null), brand,
category_name, color, attributes (array), size_label (um de: ${PRODUCT_SIZE_LABELS.join(", ")} ou null),
size_group (um de: ${SIZE_GROUPS.join(", ")} ou null), gender (menino|menina|unissex ou null),
condition (novo|seminovo|bom_estado|com_detalhes ou null), tags (array).

Regras (D135):
- EXTRAIA o que foi dito; NÃO invente fatos.
- Se preço NÃO foi falado → price = null (NUNCA chute preço).
- Se marca não citada → brand = null.
- Se idade/faixa não citada → size_group = null.
- description = reescrita fiel e curta do que foi ditado (sem marketing inventado).
- name = título curto a partir do falado (ex. "Vestido Tip Top rosa").
- color e attributes viram tags além do campo color/attributes.`;
}
