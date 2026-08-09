import {
  buildManualPreviewDrafts,
  isUsefulAudioNote,
  mergeAiDraft,
  resolveAiApiKey,
  voiceExtractSystemPrompt,
  aiStructuredItemSchema,
} from "@/features/admin/ai-intake/ai-config";
import type { GeneratePreviewInput, IntakeDraftItem } from "@/features/admin/ai-intake/schemas";
import type { Env } from "@/lib/env/load-server";

export {
  buildManualPreviewDrafts,
  isAiIntakeConfigured,
  resolveAiApiKey,
  isUsefulAudioNote,
  mergeAiDraft,
  buildTagsFromAi,
  voiceExtractSystemPrompt,
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
  const match = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/.exec(dataUrl);
  if (!match) return null;
  const mime = match[1] || "application/octet-stream";
  const isBase64 = Boolean(match[2]);
  const data = match[3] ?? "";
  if (isBase64) {
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return { mime, bytes };
  }
  const decoded = decodeURIComponent(data);
  return { mime, bytes: new TextEncoder().encode(decoded) };
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

/**
 * Voice intake (D135): STT → LLM text extract. Images are NOT sent to the LLM.
 * On any failure, falls back to empty/manual drafts (never blocks intake).
 */
export async function generateAiPreviewDrafts(params: {
  env: Env;
  input: GeneratePreviewInput;
  fetchImpl?: typeof fetch;
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
      };
    }

    const userText = [
      `Analise ${usable.length} peça(s) só pelo texto transcrito (sem imagens).`,
      ...usable.map(
        (t) =>
          `Peça client_id=${t.client_id}. Transcrição: ${t.transcript}`,
      ),
    ].join("\n\n");

    const response = await fetchImpl(
      `${chatBaseUrl(resolved.source)}/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resolved.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: voiceExtractSystemPrompt() },
            { role: "user", content: userText },
          ],
          temperature: 0.2,
        }),
        signal: AbortSignal.timeout(60000),
      },
    );

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
      usage?: unknown;
    };

    console.info(
      JSON.stringify({
        scope: "ai-intake",
        event: "llm_usage",
        usage: payload.usage ?? null,
        items: usable.length,
      }),
    );

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

    const transcriptByClient = new Map(
      transcripts.map((t) => [t.client_id, t.transcript] as const),
    );

    const drafts = params.input.items.map((item) => {
      const ai = byClient.get(item.client_id);
      const transcript = transcriptByClient.get(item.client_id) ?? null;
      if (!ai) {
        return buildManualPreviewDrafts({ items: [item] })[0];
      }
      return mergeAiDraft(item, ai, transcript);
    });

    return {
      drafts,
      mode: "ai",
      warning: warnings.length > 0 ? warnings.join(" ") : undefined,
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
