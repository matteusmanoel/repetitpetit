import {
  buildManualPreviewDrafts,
  formatVoiceDomainContext,
  isUsefulAudioNote,
  mergeAiDraft,
  mergeEditPatchDraft,
  parseAndValidateLlmItems,
  resolveAiApiKey,
  voiceExtractSystemPrompt,
  voiceSttPrompt,
  type AiStructuredItem,
  type VoiceDomainContext,
  type VoiceEditContext,
} from "@/features/admin/ai-intake/ai-config";
import type { GeneratePreviewInput, IntakeDraftItem } from "@/features/admin/ai-intake/schemas";
import type { Env } from "@/lib/env/load-server";

export {
  buildManualPreviewDrafts,
  isAiIntakeConfigured,
  resolveAiApiKey,
  isUsefulAudioNote,
  mergeAiDraft,
  mergeEditPatchDraft,
  buildTagsFromAi,
  voiceExtractSystemPrompt,
  voiceSttPrompt,
  formatVoiceDomainContext,
  resolveMergedSizeGroup,
  parseAndValidateLlmItems,
  composeIntakeProductName,
  capitalizeColorLabel,
  isPriceOnlyEditTranscript,
} from "@/features/admin/ai-intake/ai-config";

const OPENAI_API_BASE = "https://api.openai.com/v1";
const GATEWAY_API_BASE = "https://ai-gateway.vercel.sh/v1";

function chatBaseUrl(source: "openai" | "gateway"): string {
  return source === "gateway" ? GATEWAY_API_BASE : OPENAI_API_BASE;
}

/** STT always hits OpenAI audio API (gateway often lacks transcriptions). */
function transcriptionBaseUrl(source: "openai" | "gateway"): string | null {
  if (source === "openai") return OPENAI_API_BASE;
  return null;
}

function parseDataUrl(dataUrl: string): { mime: string; bytes: Uint8Array } | null {
  if (!dataUrl.startsWith("data:")) return null;
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return null;

  const meta = dataUrl.slice("data:".length, comma);
  const data = dataUrl.slice(comma + 1);
  const parts = meta.split(";").map((part) => part.trim()).filter(Boolean);
  const mime = parts[0] || "application/octet-stream";
  const isBase64 = parts.some((part) => part.toLowerCase() === "base64");

  if (isBase64) {
    try {
      const binary = atob(data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      return { mime, bytes };
    } catch {
      return null;
    }
  }

  try {
    const decoded = decodeURIComponent(data);
    return { mime, bytes: new TextEncoder().encode(decoded) };
  } catch {
    return null;
  }
}

/** Exported for unit tests (codec params in MediaRecorder data URLs). */
export function parseAudioDataUrlForTest(dataUrl: string) {
  return parseDataUrl(dataUrl);
}

function extensionForMime(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4") || mime.includes("m4a")) return "mp4";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

export async function transcribeAudioDataUrl(params: {
  apiKey: string;
  baseUrl: string;
  dataUrl: string;
  fetchImpl?: typeof fetch;
}): Promise<{ text: string; usage?: unknown }> {
  const parsed = parseDataUrl(params.dataUrl);
  if (!parsed) {
    throw new Error("Áudio em formato data URL inválido.");
  }

  const filename = `intake.${extensionForMime(parsed.mime)}`;
  const blob = new Blob([parsed.bytes.buffer.slice(
    parsed.bytes.byteOffset,
    parsed.bytes.byteOffset + parsed.bytes.byteLength,
  ) as ArrayBuffer], { type: parsed.mime });
  const file = new File([blob], filename, { type: parsed.mime });
  const form = new FormData();
  form.append("file", file);
  form.append("model", "gpt-4o-mini-transcribe");
  form.append("language", "pt");
  form.append("prompt", voiceSttPrompt());

  const fetchImpl = params.fetchImpl ?? fetch;
  const response = await fetchImpl(`${params.baseUrl}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: form,
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`STT ${response.status}: ${detail.slice(0, 160)}`);
  }

  const payload = (await response.json()) as {
    text?: string;
    usage?: unknown;
  };
  const text = payload.text?.trim() ?? "";
  if (!text) {
    throw new Error("STT retornou texto vazio.");
  }
  return { text, usage: payload.usage };
}

async function resolveTranscriptForItem(params: {
  item: GeneratePreviewInput["items"][number];
  apiKey: string;
  source: "openai" | "gateway";
  fetchImpl: typeof fetch;
}): Promise<{ transcript: string | null; warning?: string }> {
  const { item, apiKey, source, fetchImpl } = params;

  if (item.audio_data_url?.startsWith("data:")) {
    const sttBase = transcriptionBaseUrl(source);
    if (!sttBase) {
      if (isUsefulAudioNote(item.audio_note)) {
        return { transcript: item.audio_note!.trim() };
      }
      return {
        transcript: null,
        warning:
          "STT indisponível via AI Gateway — use OPENAI_API_KEY para transcrever áudio.",
      };
    }
    try {
      const { text, usage } = await transcribeAudioDataUrl({
        apiKey,
        baseUrl: sttBase,
        dataUrl: item.audio_data_url,
        fetchImpl,
      });
      console.info(
        JSON.stringify({
          scope: "ai-intake",
          event: "stt_usage",
          client_id: item.client_id,
          usage: usage ?? null,
          chars: text.length,
        }),
      );
      return { transcript: text };
    } catch (error) {
      if (isUsefulAudioNote(item.audio_note)) {
        return {
          transcript: item.audio_note!.trim(),
          warning:
            error instanceof Error
              ? `STT falhou (${error.message}); usando nota de texto.`
              : "STT falhou; usando nota de texto.",
        };
      }
      return {
        transcript: null,
        warning:
          error instanceof Error
            ? `STT falhou (${error.message}).`
            : "STT falhou.",
      };
    }
  }

  if (isUsefulAudioNote(item.audio_note)) {
    return { transcript: item.audio_note!.trim() };
  }

  return {
    transcript: null,
    warning: "Sem áudio/transcrição útil para esta peça.",
  };
}

async function callLlmExtract(params: {
  apiKey: string;
  source: "openai" | "gateway";
  userText: string;
  fetchImpl: typeof fetch;
}): Promise<{ raw: string; usage?: unknown }> {
  const response = await params.fetchImpl(
    `${chatBaseUrl(params.source)}/chat/completions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: voiceExtractSystemPrompt() },
          { role: "user", content: params.userText },
        ],
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(60000),
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`LLM ${response.status}: ${detail.slice(0, 120)}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: unknown;
  };

  console.info(
    JSON.stringify({
      scope: "ai-intake",
      event: "llm_usage",
      usage: payload.usage ?? null,
    }),
  );

  return {
    raw: payload.choices?.[0]?.message?.content ?? "{}",
    usage: payload.usage,
  };
}

function extractItemsArray(raw: string): unknown[] {
  const parsedJson = JSON.parse(raw) as { items?: unknown };
  return Array.isArray(parsedJson.items) ? parsedJson.items : [];
}

/**
 * Voice intake (D135/D140): STT → LLM text extract. Images are NOT sent to the LLM.
 * Cardinality invariant: N usable transcripts → exactly N LLM items (1 per client_id).
 * On failure, falls back to empty/manual drafts (never blocks intake).
 */
export async function generateAiPreviewDrafts(params: {
  env: Env;
  input: GeneratePreviewInput;
  fetchImpl?: typeof fetch;
  domainContext?: VoiceDomainContext;
  /** Dialog edit: peça atual + instrução de patch parcial. */
  editContext?: VoiceEditContext;
}): Promise<{
  drafts: IntakeDraftItem[];
  mode: "ai" | "manual";
  warning?: string;
  debug?: {
    transcripts: Array<{ client_id: string; transcript: string | null }>;
    llm_user_text?: string;
    llm_raw?: string;
  };
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

  const fetchImpl = params.fetchImpl ?? fetch;
  const warnings: string[] = [];

  try {
    const transcripts: Array<{ client_id: string; transcript: string | null }> =
      [];

    for (const item of params.input.items) {
      const resolvedTx = await resolveTranscriptForItem({
        item,
        apiKey: resolved.key,
        source: resolved.source,
        fetchImpl,
      });
      if (resolvedTx.warning) warnings.push(resolvedTx.warning);
      transcripts.push({
        client_id: item.client_id,
        transcript: resolvedTx.transcript,
      });
    }

    const usable = transcripts.filter((t) => t.transcript);
    if (usable.length === 0) {
      return {
        drafts: buildManualPreviewDrafts(params.input),
        mode: "manual",
        warning:
          warnings.join(" ") ||
          "Sem transcrição — preencha o preview manualmente.",
        debug: { transcripts },
      };
    }

    const expectedClientIds = usable.map((t) => t.client_id);
    const domainBlock = params.domainContext
      ? formatVoiceDomainContext(params.domainContext)
      : null;

    const editBlock = params.editContext
      ? [
          "MODO EDIÇÃO: a peça JÁ ESTÁ cadastrada. A transcrição pode pedir só uma alteração (ex. preço).",
          "Devolva o item completo com client_id; COPIE do JSON atual todo campo que a transcrição NÃO alterar.",
          "NÃO invente nome/descrição/marca/estado. Sem preço falado → mantenha o price atual.",
          `Peça atual (JSON): ${JSON.stringify(params.editContext)}`,
        ].join("\n")
      : null;

    const userText = [
      params.editContext
        ? `Atualize ${usable.length} peça(s) a partir da transcrição (sem imagens).`
        : `Analise ${usable.length} peça(s) só pelo texto transcrito (sem imagens).`,
      `Emita exatamente ${usable.length} item(ns) em "items", um por client_id abaixo — sem duplicar.`,
      ...(domainBlock ? [domainBlock] : []),
      ...(editBlock ? [editBlock] : []),
      ...usable.map(
        (t) =>
          `Peça client_id=${t.client_id}. Transcrição: ${t.transcript}`,
      ),
    ].join("\n\n");

    let raw = "";
    let validated: AiStructuredItem[] | null = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const llm = await callLlmExtract({
          apiKey: resolved.key,
          source: resolved.source,
          userText,
          fetchImpl,
        });
        raw = llm.raw;
      } catch (error) {
        if (attempt === 0) continue;
        return {
          drafts: buildManualPreviewDrafts(params.input),
          mode: "manual",
          warning:
            error instanceof Error
              ? `IA indisponível (${error.message}). Preview manual.`
              : "IA indisponível. Preview manual.",
          debug: { transcripts, llm_user_text: userText, llm_raw: raw || undefined },
        };
      }

      let itemsRaw: unknown[];
      try {
        itemsRaw = extractItemsArray(raw);
      } catch {
        console.info(
          JSON.stringify({
            scope: "ai-intake",
            event: "llm_cardinality_mismatch",
            reason: "json_parse",
            attempt: attempt + 1,
            expected: expectedClientIds,
          }),
        );
        if (attempt === 0) continue;
        return {
          drafts: buildManualPreviewDrafts(params.input),
          mode: "manual",
          warning:
            "IA retornou JSON inválido; preencha o preview manualmente.",
          debug: { transcripts, llm_user_text: userText, llm_raw: raw },
        };
      }

      const check = parseAndValidateLlmItems(itemsRaw, expectedClientIds);
      if (check.ok) {
        validated = check.items;
        break;
      }

      console.info(
        JSON.stringify({
          scope: "ai-intake",
          event: "llm_cardinality_mismatch",
          reason: check.reason,
          attempt: attempt + 1,
          expected: expectedClientIds,
          got_count: check.gotCount,
          got_client_ids: check.gotClientIds,
          llm_raw_preview: raw.slice(0, 280),
        }),
      );
    }

    if (!validated) {
      return {
        drafts: buildManualPreviewDrafts(params.input),
        mode: "manual",
        warning:
          "IA retornou itens inconsistentes; preencha o preview manualmente.",
        debug: { transcripts, llm_user_text: userText, llm_raw: raw },
      };
    }

    const byClient = new Map(
      validated.map((item) => [item.client_id, item] as const),
    );
    const transcriptByClient = new Map(
      transcripts.map((t) => [t.client_id, t.transcript] as const),
    );

    const drafts = params.input.items.map((item) => {
      const ai = byClient.get(item.client_id);
      const transcript = transcriptByClient.get(item.client_id) ?? null;
      if (!ai) {
        return buildManualPreviewDrafts({ items: [item] })[0];
      }
      if (params.editContext) {
        return mergeEditPatchDraft(
          item,
          ai,
          params.editContext,
          transcript,
        );
      }
      return mergeAiDraft(item, ai, transcript);
    });

    return {
      drafts,
      mode: "ai",
      warning: warnings.length > 0 ? warnings.join(" ") : undefined,
      debug: {
        transcripts,
        llm_user_text: userText,
        llm_raw: raw,
      },
    };
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
