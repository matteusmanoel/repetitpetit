import "server-only";

import {
  SIZE_GROUPS,
} from "@/features/admin/product-constants";
import {
  aiStructuredItemSchema,
  buildManualPreviewDrafts,
  mergeAiDraft,
  resolveAiApiKey,
} from "@/features/admin/ai-intake/ai-config";
import type { GeneratePreviewInput, IntakeDraftItem } from "@/features/admin/ai-intake/schemas";
import type { Env } from "@/lib/env/load-server";

export {
  buildManualPreviewDrafts,
  isAiIntakeConfigured,
  resolveAiApiKey,
} from "@/features/admin/ai-intake/ai-config";

/**
 * Multimodal draft generation via OpenAI-compatible Chat Completions.
 * On any failure, falls back to empty/manual drafts (never blocks intake).
 */
export async function generateAiPreviewDrafts(params: {
  env: Env;
  input: GeneratePreviewInput;
}): Promise<{
  drafts: IntakeDraftItem[];
  mode: "ai" | "manual";
  warning?: string;
}> {
  const resolved = resolveAiApiKey(params.env);
  if (!resolved) {
    return {
      drafts: buildManualPreviewDrafts(params.input),
      mode: "manual",
      warning:
        "IA não configurada — preencha o preview manualmente (OPENAI_API_KEY opcional).",
    };
  }

  try {
    const system = `Você extrai dados de peças de brechó infantil (Repeti Petit).
Responda APENAS JSON válido: {"items":[{...}]}.
Campos por item: client_id (ecoar), name, description, price (número BRL), brand,
size_label (um de: RN, P, M, G), size_group (um de: ${SIZE_GROUPS.join(", ")}), gender (menino|menina|unissex),
condition (novo|seminovo|bom_estado|com_detalhes), tags (array de strings).
Preço sugerido realista para seminovos infantis no Brasil.`;

    const userContent: Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    > = [
      {
        type: "text",
        text: `Analise ${params.input.items.length} peça(s). client_ids: ${params.input.items
          .map((i) => i.client_id)
          .join(", ")}.`,
      },
    ];

    for (const item of params.input.items) {
      userContent.push({
        type: "text",
        text: `Peça client_id=${item.client_id}. Nota de áudio/texto: ${item.audio_note ?? "(nenhuma)"}`,
      });
      for (const image of item.images.slice(0, 4)) {
        userContent.push({
          type: "image_url",
          image_url: { url: image.image_url },
        });
      }
    }

    const baseUrl =
      resolved.source === "gateway"
        ? "https://ai-gateway.vercel.sh/v1"
        : "https://api.openai.com/v1";

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resolved.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent },
        ],
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return {
        drafts: buildManualPreviewDrafts(params.input),
        mode: "manual",
        warning: `IA indisponível (${response.status}). Preview manual. ${detail.slice(0, 120)}`,
      };
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = payload.choices?.[0]?.message?.content ?? "{}";
    const parsedJson = JSON.parse(raw) as { items?: unknown };
    const itemsRaw = Array.isArray(parsedJson.items) ? parsedJson.items : [];

    const byClient = new Map<
      string,
      ReturnType<typeof aiStructuredItemSchema.parse>
    >();
    for (const row of itemsRaw) {
      const parsed = aiStructuredItemSchema.safeParse(row);
      if (parsed.success) {
        byClient.set(parsed.data.client_id, parsed.data);
      }
    }

    const drafts = params.input.items.map((item) => {
      const ai = byClient.get(item.client_id);
      if (!ai) {
        return buildManualPreviewDrafts({ items: [item] })[0];
      }
      return mergeAiDraft(item, ai);
    });

    return { drafts, mode: "ai" };
  } catch (error) {
    return {
      drafts: buildManualPreviewDrafts(params.input),
      mode: "manual",
      warning:
        error instanceof Error
          ? `IA falhou (${error.message}). Preview manual.`
          : "IA falhou. Preview manual.",
    };
  }
}
