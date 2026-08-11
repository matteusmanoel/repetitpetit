import { z } from "zod";

import {
  alignTextToCanonicalBrand,
  normalizeBrandName,
} from "@/features/admin/ai-intake/category-match";
import {
  PRODUCT_CONDITIONS,
  PRODUCT_GENDERS,
  PRODUCT_SIZE_LABELS,
  SIZE_GROUP_LABELS,
  SIZE_GROUPS,
  coerceProductSizeLabel,
  slugifyProductName,
  type SizeGroup,
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
  /** LLM às vezes devolve "30,00" / "R$ 30" — coerce antes de validar. */
  price: z.preprocess((value) => {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === "string") {
      const cleaned = value
        .replace(/R\$\s?/gi, "")
        .replace(/\s/g, "")
        .replace(",", ".")
        .trim();
      if (!cleaned) return null;
      const n = Number(cleaned);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  }, z.number().nullable().optional().default(null)),
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

/** Max tags persisted from voice intake merge (D141). */
export const VOICE_INTAKE_MAX_TAGS = 12;

function normalizeTagToken(raw: string): string | null {
  const t = raw.trim().toLocaleLowerCase("pt-BR").replace(/\s+/g, " ");
  return t.length > 0 ? t : null;
}

/**
 * Search tags from spoken/extracted facts only: color, attributes, category,
 * plus LLM suggestions. Normalize, dedupe, cap — no invented tokens in code.
 */
export function buildTagsFromAi(ai: AiStructuredItem): string[] {
  const tags = new Set<string>();
  const add = (raw: string | null | undefined) => {
    if (!raw) return;
    const t = normalizeTagToken(raw);
    if (t) tags.add(t);
  };

  add(ai.color);
  add(ai.category_name);
  for (const attr of ai.attributes ?? []) add(attr);
  for (const tag of ai.tags ?? []) add(tag);

  return Array.from(tags).slice(0, VOICE_INTAKE_MAX_TAGS);
}

/**
 * Resolve size_group after LLM: keep explicit AI value; RN without age → rn_3m;
 * otherwise soft default 2_3a (DB NOT NULL).
 */
export function resolveMergedSizeGroup(
  sizeLabel: string,
  aiSizeGroup: SizeGroup | null | undefined,
): SizeGroup {
  if (aiSizeGroup) return aiSizeGroup;
  if (sizeLabel === "RN") return "rn_3m";
  return "2_3a";
}

/** Capitalize a simple color label only — never apply to brands/names. */
export function capitalizeColorLabel(color: string): string {
  return color
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLocaleLowerCase("pt-BR");
      return lower.charAt(0).toLocaleUpperCase("pt-BR") + lower.slice(1);
    })
    .join(" ");
}

/**
 * Safe name from already-normalized fields (Categoria + Marca + Cor).
 * Preserves brand/category strings as-is (no Title Case). Falls back to LLM name.
 */
export function composeIntakeProductName(parts: {
  category_name?: string | null;
  brand?: string | null;
  color?: string | null;
  fallbackName?: string | null;
}): string {
  const category = parts.category_name?.trim() || "";
  const brand = parts.brand?.trim() || "";
  const colorRaw = parts.color?.trim() || "";
  const color = colorRaw ? capitalizeColorLabel(colorRaw) : "";
  const composed = [category, brand, color].filter(Boolean).join(" ");
  if (composed) return composed;
  return parts.fallbackName?.trim() || "";
}

export type LlmCardinalityResult =
  | { ok: true; items: AiStructuredItem[] }
  | {
      ok: false;
      reason: string;
      gotCount: number;
      gotClientIds: string[];
    };

/**
 * Structural invariant: N expected client_ids → exactly N items, one each, all valid.
 * No silent dedupe by Map / similarity.
 * N=1: se o LLM omitir client_id, injeta o esperado (comum em áudio de patch no dialog).
 */
export function parseAndValidateLlmItems(
  itemsRaw: unknown[],
  expectedClientIds: string[],
): LlmCardinalityResult {
  const expected = new Set(expectedClientIds);
  const gotClientIds: string[] = [];

  let rows = itemsRaw;
  if (
    rows.length === 1 &&
    expectedClientIds.length === 1 &&
    rows[0] &&
    typeof rows[0] === "object"
  ) {
    const row = rows[0] as Record<string, unknown>;
    const id = row.client_id;
    if (typeof id !== "string" || !id.trim()) {
      rows = [{ ...row, client_id: expectedClientIds[0] }];
    }
  }

  if (rows.length !== expectedClientIds.length) {
    for (const row of rows) {
      if (row && typeof row === "object" && "client_id" in row) {
        const id = (row as { client_id?: unknown }).client_id;
        if (typeof id === "string") gotClientIds.push(id);
      }
    }
    return {
      ok: false,
      reason: `length_mismatch: got ${rows.length}, expected ${expectedClientIds.length}`,
      gotCount: rows.length,
      gotClientIds,
    };
  }

  const parsed: AiStructuredItem[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const result = aiStructuredItemSchema.safeParse(row);
    if (!result.success) {
      return {
        ok: false,
        reason: "schema_invalid",
        gotCount: rows.length,
        gotClientIds: [...seen],
      };
    }
    const id = result.data.client_id;
    if (seen.has(id)) {
      return {
        ok: false,
        reason: `duplicate_client_id:${id}`,
        gotCount: rows.length,
        gotClientIds: [...seen, id],
      };
    }
    if (!expected.has(id)) {
      return {
        ok: false,
        reason: `unexpected_client_id:${id}`,
        gotCount: rows.length,
        gotClientIds: [...seen, id],
      };
    }
    seen.add(id);
    parsed.push(result.data);
  }

  for (const id of expectedClientIds) {
    if (!seen.has(id)) {
      return {
        ok: false,
        reason: `missing_client_id:${id}`,
        gotCount: rows.length,
        gotClientIds: [...seen],
      };
    }
  }

  return { ok: true, items: parsed };
}

export type VoiceDomainContext = {
  categoryNames: string[];
  brandNames: string[];
};

/** Campos atuais da peça (dialog edit) — LLM faz patch, não inventa cadastro. */
export type VoiceEditContext = {
  name: string;
  description: string | null;
  price: number | null;
  brand: string | null;
  size_label: string | null;
  size_group: string | null;
  gender: string | null;
  condition: string | null;
  category_name: string | null;
  tags: string[];
};

export function mergeAiDraft(
  source: GeneratePreviewInput["items"][number],
  ai: AiStructuredItem,
  transcript?: string | null,
): IntakeDraftItem {
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

  const categoryName = ai.category_name?.trim() || null;
  const spokenBrand = ai.brand?.trim() || null;
  const brand = normalizeBrandName(spokenBrand);
  const color = ai.color?.trim() || null;
  const name = composeIntakeProductName({
    category_name: categoryName,
    brand,
    color,
    fallbackName: ai.name,
  });

  const rawDescription = ai.description?.trim() || transcript?.trim() || null;
  const description = alignTextToCanonicalBrand(
    rawDescription,
    brand,
    spokenBrand,
  );

  return {
    ...emptyIntakeDraft({
      client_id: source.client_id,
      images: source.images,
      audio_note: audioNote,
    }),
    name,
    slug: name ? slugifyProductName(name) : "",
    description,
    price: typeof ai.price === "number" && ai.price > 0 ? ai.price : null,
    brand,
    category_name: categoryName,
    size_label: sizeLabel,
    size_group: resolveMergedSizeGroup(sizeLabel, ai.size_group ?? null),
    gender: ai.gender ?? null,
    // Omission ≠ fact; DB DEFAULT seminovo applies only at Finalizar insert.
    condition: ai.condition ?? null,
    tags: buildTagsFromAi(ai),
  };
}

/**
 * Dialog edit: part from current product; overlay only non-empty AI fields.
 * Does NOT compose a new name from category/brand/color (avoids inventing).
 */
export function mergeEditPatchDraft(
  source: GeneratePreviewInput["items"][number],
  ai: AiStructuredItem,
  edit: VoiceEditContext,
  transcript?: string | null,
): IntakeDraftItem {
  const audioNote =
    (transcript && transcript.trim()) ||
    (isUsefulAudioNote(source.audio_note) ? source.audio_note : null) ||
    source.audio_note ||
    null;

  const spokenBrand = ai.brand?.trim() || null;
  const brandFromAi = normalizeBrandName(spokenBrand);
  const brand = brandFromAi || edit.brand;

  const sizeRaw = ai.size_label?.trim();
  const sizeLabel = sizeRaw
    ? coerceProductSizeLabel(sizeRaw)
    : (edit.size_label ?? "");

  const name = ai.name?.trim() || edit.name;
  const rawDescription =
    ai.description?.trim() || edit.description?.trim() || null;
  const description = alignTextToCanonicalBrand(
    rawDescription,
    brand,
    spokenBrand,
  );

  const price =
    typeof ai.price === "number" && ai.price > 0
      ? ai.price
      : (edit.price ?? null);

  const sizeGroupRaw = ai.size_group ?? edit.size_group ?? null;
  const sizeGroup = resolveMergedSizeGroup(
    sizeLabel,
    sizeGroupRaw as SizeGroup | null,
  );

  const tagsFromAi = buildTagsFromAi(ai);
  const tags =
    tagsFromAi.length > 0 ? tagsFromAi : edit.tags.length > 0 ? edit.tags : [];

  return {
    ...emptyIntakeDraft({
      client_id: source.client_id,
      images: source.images,
      audio_note: audioNote,
    }),
    name,
    slug: name ? slugifyProductName(name) : "",
    description,
    price,
    brand,
    category_name: ai.category_name?.trim() || edit.category_name,
    size_label: sizeLabel,
    size_group: sizeGroup,
    gender: ai.gender ?? (edit.gender as AiStructuredItem["gender"]) ?? null,
    condition:
      ai.condition ??
      (edit.condition as AiStructuredItem["condition"]) ??
      null,
    tags,
  };
}

/** Transcrição de edição que só fala de preço (patch seletivo). */
export function isPriceOnlyEditTranscript(
  transcript: string | null | undefined,
): boolean {
  const t = transcript?.toLocaleLowerCase("pt-BR")?.trim() ?? "";
  if (!t) return false;
  const hasPriceCue =
    /pre[cç]o|reais?\b|r\$|\d+[.,]\d{2}|\d+\s*(reais?|real)/i.test(t);
  if (!hasPriceCue) return false;
  const hasOtherFieldCue =
    /\b(nome|descri[cç][aã]o|marca|tamanho|categoria|g[eê]nero|condi[cç][aã]o|estado|tags?)\b/i.test(
      t,
    );
  return !hasOtherFieldCue;
}

/** Compact catalog hints for the LLM user message (not full product dump). */
export function formatVoiceDomainContext(ctx: VoiceDomainContext): string {
  const categories =
    ctx.categoryNames.length > 0
      ? ctx.categoryNames.join(", ")
      : "(nenhuma)";
  const brands =
    ctx.brandNames.length > 0 ? ctx.brandNames.join(", ") : "(nenhuma)";
  const sizeGroups = SIZE_GROUPS.map(
    (g) => `${g}=${SIZE_GROUP_LABELS[g]}`,
  ).join("; ");
  return [
    "Contexto do catálogo (candidatos para match). Valores explicitamente falados devem ser preservados mesmo se ainda não existirem na lista — não invente fatos, mas não descarte o que foi dito.",
    `Categorias existentes: ${categories}`,
    `Marcas conhecidas: ${brands}`,
    `size_label: ${PRODUCT_SIZE_LABELS.join(" | ")}`,
    `size_group: ${sizeGroups}`,
  ].join("\n");
}

/**
 * Bias vocabulary for OpenAI transcriptions (prices, sizes, brands, kids terms).
 * Kept short — Whisper/gpt-transcribe prompt window is limited.
 */
export function voiceSttPrompt(): string {
  return [
    "Brechó infantil em português do Brasil.",
    "Vocabulário frequente: Body, Vestido, Calça, Casaco, Moletom, Tip Top, Carter's, GAP, Hello Kitty, meia malha, manga curta, RN, P, M, G.",
    "Preços em reais com vírgula: 19,90 29,90 39,90 49,90 59,90 69,90 79,90.",
    "Idades: RN a 3 meses, 3 a 6 meses, 2 a 3 anos, 4 a 5 anos.",
  ].join(" ");
}

export function voiceExtractSystemPrompt(): string {
  return `Você extrai dados de peças de brechó infantil (Repeti Petit) a partir de TRANSCRIÇÕES de áudio.
Responda APENAS JSON válido no formato: {"items":[{...}]}.

CARDINALIDADE (obrigatório):
- O user indica N peça(s) com client_id.
- Emita EXATAMENTE N itens em "items" — um por client_id listado.
- Ecoe cada client_id exatamente uma vez. NÃO duplique. NÃO invente client_id.
- Os exemplos abaixo são ILUSTRATIVOS (formato); não os copie como itens extras.

Campos por item: client_id, name, description, price (número BRL ou null), brand,
category_name, color, attributes (características objetivas), size_label (um de: ${PRODUCT_SIZE_LABELS.join(", ")} ou null),
size_group (um de: ${SIZE_GROUPS.join(", ")} ou null), gender (menino|menina|unissex ou null),
condition (novo|seminovo|bom_estado|com_detalhes ou null), tags (até ~10 termos de busca).

Princípio: enriquecer APRESENTAÇÃO e organização dos fatos falados; NUNCA inventar fatos
(tecido, estado, conforto, gênero) além do dito ou de regras explícitas abaixo.
Se o user indicar MODO EDIÇÃO com JSON da peça atual: patch parcial — copie campos
não alterados; null nos campos que a transcrição não mudou; NÃO invente cadastro novo.

Regras:
- EXTRAIA o que foi dito; NÃO invente fatos.
- NÃO estime preço. Sem preço na transcrição → price = null.
- Marca: se conhecida no contexto, use a grafia canônica (ex. Tip Top). Marca nova → preserve o falado. Sem marca → null.
- Idade/faixa NÃO citada → size_group = null (backend pode mapear RN→rn_3m).
- category_name = tipo/categoria FALADA (ex. "Body"). Use nome canônico do contexto SÓ se for o mesmo termo (match exato). NÃO remapeie para outra categoria só porque existe no catálogo. Tipo falado inexistente no catálogo → preserve.
- attributes = o que foi dito (manga curta, meia malha, Hello Kitty…).
- color = cor falada ou null.
- gender: SÓ se explícito. NUNCA inferir de cor, Hello Kitty ou "bebê". Sem evidência → null.
- condition: SÓ se falado; senão null.
- name = ordem Categoria → Marca → Cor (ex. "Body Tip Top Rosa"); sem fatos extras.
- description = 1–2 frases curtas, naturais e úteis para catálogo infantil/seminovos.
  Baseie-se SÓ nos fatos (categoria, marca, cor, attributes). Sem preço, tamanho ou gênero.
  Sem marketing exagerado ("super confortável", "excelente estado", "algodão" se não falado).
- tags = termos de busca derivados EXCLUSIVAMENTE do falado/extraído (categoria, cor,
  personagem/licença, material falado, modelagem). Sem inventar. Ex.: rosa, body, hello kitty.
  Inclua "bebê" só se a palavra (ou equivalente) foi dita.

Exemplo ilustrativo (1 peça; N=1):
User: Peça client_id=abc. Transcrição: Body rosa manga curta bebê Hello Kitty meia malha Tip Top 59,90 RN
Resposta:
{"items":[{"client_id":"abc","name":"Body Tip Top Rosa","description":"Body Tip Top rosa em meia malha, com manga curta e estampa da Hello Kitty.","price":59.9,"brand":"Tip Top","category_name":"Body","color":"rosa","attributes":["manga curta","Hello Kitty","meia malha"],"size_label":"RN","size_group":"rn_3m","gender":null,"condition":null,"tags":["rosa","body","hello kitty","manga curta","meia malha","bebê"]}]}
`;
}
