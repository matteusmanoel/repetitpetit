"use client";

/**
 * Cadastro em massa — sessão fullscreen (D137).
 * Foto: câmera nativa (`capture`) + placeholder (sem getUserMedia de vídeo).
 * Fluxo: lobby → foto → áudio → confirmar IA → preview edit → aprovar → próxima.
 * Finalizar → commit lote → /admin/produtos + toast.
 */

import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  List,
  Mic,
  Pencil,
  Repeat2,
  Shuffle,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { brandToast } from "@/lib/brand-toast";

import {
  IntakeRemoveConfirm,
  IntakeSeriesDrawer,
} from "@/components/admin/IntakeSeriesDrawer";
import { SessionDraftForm } from "@/components/admin/SessionDraftForm";
import { VoiceScriptTip, type VoiceScriptChecked } from "@/components/admin/VoiceScriptTip";
import { Button } from "@/components/ui/button";
import {
  confirmIntakeBatchAction,
  generateIntakePreviewAction,
} from "@/features/admin/ai-intake/actions";
import {
  canFinalizeIntakeDrafts,
  classifyCameraError,
  micErrorMessagePt,
} from "@/features/admin/ai-intake/mass-capture";
import {
  prepareIntakePhotoForUpload,
  uploadNetworkErrorMessage,
} from "@/features/admin/ai-intake/prepare-intake-photo";
import { isUsefulAudioNote } from "@/features/admin/ai-intake/ai-config";
import {
  emptyIntakeDraft,
  type IntakeDraftItem,
} from "@/features/admin/ai-intake/schemas";
import { slugifyProductName } from "@/features/admin/product-constants";
import type { CategoryOption } from "@/features/admin/product-types";
import { cn } from "@/lib/utils";

type Mode =
  | "lobby"
  | "camera"
  | "record"
  | "confirm"
  | "working"
  | "preview";

type Props = {
  categories: CategoryOption[];
  aiConfigured: boolean;
};

function newClientId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") {
    try {
      return c.randomUUID();
    } catch {
      // iOS WKWebView / Safari antigo pode expor crypto sem randomUUID
    }
  }
  if (c && typeof c.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);
    bytes[6] = (bytes[6]! & 0x0f) | 0x40;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Soft money coerce — never emit NaN to the finalize schema. */
function coerceMoney(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const n = Number(value.replace(",", ".").trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function AdminAiIntakeClient({ categories, aiConfigured }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("lobby");
  const [categoryOptions, setCategoryOptions] =
    useState<CategoryOption[]>(categories);
  const [approved, setApproved] = useState<IntakeDraftItem[]>([]);
  const [publishById, setPublishById] = useState<Record<string, boolean>>({});
  const [clientId, setClientId] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [audioDataUrl, setAudioDataUrl] = useState<string | null>(null);
  const [draft, setDraft] = useState<IntakeDraftItem | null>(null);
  const [recording, setRecording] = useState(false);
  const [recMs, setRecMs] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [retakingPhoto, setRetakingPhoto] = useState(false);
  const [exitConfirm, setExitConfirm] = useState<
    "cancel" | "finish" | "reshuffle" | null
  >(null);
  const [seriesDrawerOpen, setSeriesDrawerOpen] = useState(false);
  const [removeTargetId, setRemoveTargetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [scriptChecked, setScriptChecked] = useState<VoiceScriptChecked>({});
  const [aiDebug, setAiDebug] = useState<{
    transcript: string | null;
    llm_user_text?: string;
    llm_raw?: string;
  } | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recTimer = useRef<number | null>(null);

  useEffect(() => {
    setCategoryOptions(categories);
  }, [categories]);

  // Lock scroll + pinch-zoom while in fullscreen session modes.
  useEffect(() => {
    if (mode === "lobby") return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevTouchAction = body.style.touchAction;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.touchAction =
      mode === "preview" || mode === "record" || mode === "confirm"
        ? "pan-y"
        : "none";

    const meta = document.querySelector('meta[name="viewport"]');
    const prevContent = meta?.getAttribute("content") ?? null;
    meta?.setAttribute(
      "content",
      "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
    );

    const preventGesture = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", preventGesture, {
      passive: false,
    });

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.touchAction = prevTouchAction;
      if (meta && prevContent != null) meta.setAttribute("content", prevContent);
      document.removeEventListener("gesturestart", preventGesture);
    };
  }, [mode]);

  useEffect(() => {
    if (!recording) return;
    recTimer.current = window.setInterval(() => setRecMs((m) => m + 100), 100);
    return () => {
      if (recTimer.current) window.clearInterval(recTimer.current);
    };
  }, [recording]);

  function resetPiece() {
    setClientId(newClientId());
    setPhotoUrl(null);
    setAudioDataUrl(null);
    setDraft(null);
    setRecording(false);
    setRecMs(0);
    setError(null);
    setScriptChecked({});
    setRetakingPhoto(false);
    setAiDebug(null);
  }

  function resetSession() {
    resetPiece();
    setApproved([]);
    setPublishById({});
    setSeriesDrawerOpen(false);
    setRemoveTargetId(null);
    setExitConfirm(null);
    setMode("lobby");
  }

  async function uploadBlob(blob: Blob): Promise<string> {
    let file: File;
    try {
      file = await prepareIntakePhotoForUpload(blob);
    } catch (prepareError) {
      throw new Error(uploadNetworkErrorMessage(prepareError));
    }

    const body = new FormData();
    body.append("file", file, file.name || `capture-${Date.now()}.jpg`);
    body.append("bucket", "productImages");
    body.append("pathPrefix", "ai-intake");

    let response: Response;
    try {
      response = await fetch("/api/upload", {
        method: "POST",
        body,
        credentials: "same-origin",
      });
    } catch (networkError) {
      throw new Error(uploadNetworkErrorMessage(networkError));
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(payload?.error ?? "Falha ao enviar foto.");
    }
    const payload = (await response.json()) as { url: string };
    return payload.url;
  }

  async function commitPhoto(blob: Blob) {
    setUploading(true);
    setError(null);
    try {
      const url = await uploadBlob(blob);
      setPhotoUrl(url);
      if (retakingPhoto && draft) {
        setDraft({
          ...draft,
          images: [{ image_url: url, alt_text: draft.images[0]?.alt_text ?? null }],
        });
        setRetakingPhoto(false);
        setMode("record");
        brandToast.message("Foto atualizada — grave ou envie de novo");
        return;
      }
      setAudioDataUrl(null);
      setDraft(null);
      setScriptChecked({});
      setMode("record");
      brandToast.message("Foto ok — grave o áudio da peça");
    } catch (uploadError) {
      const message = uploadNetworkErrorMessage(uploadError);
      setError(message);
      brandToast.error(message);
    } finally {
      setUploading(false);
    }
  }

  function onPhotoFile(file: File | undefined) {
    if (file) void commitPhoto(file);
  }

  function stopTracks() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function startRecording() {
    if (!photoUrl || recording) return;

    const secure =
      typeof window !== "undefined" ? window.isSecureContext : false;
    const mediaOk =
      typeof navigator !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia);

    if (!secure || !mediaOk) {
      brandToast.error(
        micErrorMessagePt(
          classifyCameraError(null, secure, mediaOk),
        ),
      );
      return;
    }

    let stream: MediaStream;
    try {
      // Preferências leves; Safari/iOS às vezes rejeita constraints extras.
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
          video: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
      }
    } catch (error) {
      brandToast.error(
        micErrorMessagePt(classifyCameraError(error, secure, true)),
      );
      return;
    }

    streamRef.current = stream;
    chunks.current = [];

    if (typeof MediaRecorder === "undefined") {
      stopTracks();
      brandToast.error(
        "Gravação de áudio não é suportada neste navegador. Tente o Safari/Chrome atualizado.",
      );
      return;
    }

    try {
      // Safari/iOS: mp4 primeiro; Chrome: webm.
      const mimeType = [
        "audio/mp4",
        "audio/aac",
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorder.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.current.push(event.data);
      };
      recorder.onerror = () => {
        stopTracks();
        setRecording(false);
        brandToast.error("Falha durante a gravação. Tente de novo.");
      };
      // Timeslice keeps chunks flowing on Safari / short takes.
      recorder.start(250);
      setRecMs(0);
      setRecording(true);
    } catch {
      stopTracks();
      brandToast.error(
        "Não foi possível iniciar a gravação neste navegador. Tente atualizar o Safari/Chrome.",
      );
    }
  }

  function stopRecording() {
    const recorder = mediaRecorder.current;
    mediaRecorder.current = null;
    setRecording(false);
    if (!recorder) {
      stopTracks();
      return;
    }
    recorder.onstop = () => {
      stopTracks();
      if (chunks.current.length === 0) {
        brandToast.message("Gravação vazia");
        return;
      }
      const blob = new Blob(chunks.current, {
        type: recorder.mimeType || "audio/webm",
      });
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setAudioDataUrl(reader.result);
          setMode("confirm");
        }
      };
      reader.readAsDataURL(blob);
    };
    if (recorder.state !== "inactive") recorder.stop();
    else stopTracks();
  }

  function toggleRecording() {
    if (recording) stopRecording();
    else void startRecording();
  }

  const runAi = useCallback(
    async (audioUrl: string | null) => {
      if (!photoUrl) return;
      setMode("working");
      setError(null);
      setAiDebug(null);
      try {
        const result = await generateIntakePreviewAction({
          items: [
            {
              client_id: clientId,
              images: [{ image_url: photoUrl, alt_text: null }],
              audio_data_url: audioUrl,
              audio_note: audioUrl ? "[áudio gravado]" : null,
            },
          ],
        });
        if (!result.ok || !result.drafts[0]) {
          setDraft(
            emptyIntakeDraft({
              client_id: clientId,
              images: [{ image_url: photoUrl, alt_text: null }],
              audio_note: audioUrl ? "[áudio gravado]" : null,
            }),
          );
          brandToast.message("Preencha o preview manualmente");
        } else {
          setDraft(result.drafts[0]);
          const tx =
            result.debug?.transcripts.find((row) => row.client_id === clientId)
              ?.transcript ??
            (isUsefulAudioNote(result.drafts[0].audio_note)
              ? result.drafts[0].audio_note
              : null);
          if (tx || result.debug?.llm_raw || result.debug?.llm_user_text) {
            setAiDebug({
              transcript: tx ?? null,
              llm_user_text: result.debug?.llm_user_text,
              llm_raw: result.debug?.llm_raw,
            });
          }
          if (result.warning) brandToast.message(result.warning);
        }
        setMode("preview");
      } catch {
        setDraft(
          emptyIntakeDraft({
            client_id: clientId,
            images: [{ image_url: photoUrl, alt_text: null }],
            audio_note: audioUrl ? "[áudio gravado]" : null,
          }),
        );
        brandToast.error("Falha na IA — preencha manualmente");
        setMode("preview");
      }
    },
    [clientId, photoUrl],
  );

  function confirmSendAudio() {
    void runAi(audioDataUrl);
  }

  /** Pencil: go to preview without STT/LLM; keep existing draft fields. */
  function openManualPreview() {
    if (!photoUrl) return;
    if (draft) {
      const currentUrl = draft.images[0]?.image_url;
      if (currentUrl !== photoUrl) {
        setDraft({
          ...draft,
          images: [
            {
              image_url: photoUrl,
              alt_text: draft.images[0]?.alt_text ?? null,
            },
          ],
        });
      }
      setMode("preview");
      return;
    }
    setDraft(
      emptyIntakeDraft({
        client_id: clientId,
        images: [{ image_url: photoUrl, alt_text: null }],
        audio_note: null,
      }),
    );
    setMode("preview");
  }

  function upsertApproved(item: IntakeDraftItem) {
    setApproved((prev) => {
      const idx = prev.findIndex((d) => d.client_id === item.client_id);
      if (idx === -1) return [...prev, item];
      const next = [...prev];
      next[idx] = item;
      return next;
    });
  }

  /** Novo item: grava a peça atual na série e abre a câmera. */
  function approveAndNext() {
    if (!draft) return;
    if (!draft.images[0]?.image_url) {
      brandToast.error("Peça sem foto");
      return;
    }
    upsertApproved(draft);
    resetPiece();
    setMode("camera");
    brandToast.success("Peça salva — próxima");
  }

  function patchCurrentDraft(patch: Partial<IntakeDraftItem>) {
    if (!draft) return;
    const next = { ...draft, ...patch };
    setDraft(next);
    setApproved((prev) => {
      const idx = prev.findIndex((d) => d.client_id === next.client_id);
      if (idx === -1) return prev;
      const copy = [...prev];
      copy[idx] = next;
      return copy;
    });
  }

  /** Série = aprovadas + peça em preview (se ainda não aprovada). */
  function seriesItems(): IntakeDraftItem[] {
    if (!draft) return approved;
    const already = approved.some((d) => d.client_id === draft.client_id);
    return already ? approved : [...approved, draft];
  }

  function jumpSeries(index: number) {
    const itemsBefore = seriesItems();
    const target = itemsBefore[index];
    if (!target) return;

    // Snapshot da série antes de navegar (setState é async).
    let nextApproved = approved.slice();

    if (draft) {
      const idx = nextApproved.findIndex((d) => d.client_id === draft.client_id);
      if (idx === -1) nextApproved.push(draft);
      else nextApproved[idx] = draft;
    } else if (
      photoUrl &&
      !nextApproved.some((d) => d.images[0]?.image_url === photoUrl)
    ) {
      // Foto recém-capturada ainda sem draft — não descartar ao abrir outra peça.
      nextApproved.push(
        emptyIntakeDraft({
          client_id: clientId || newClientId(),
          images: [{ image_url: photoUrl, alt_text: null }],
          audio_note: null,
        }),
      );
      brandToast.message("Foto em andamento salva na série");
    }

    setApproved(nextApproved);
    setDraft(target);
    setClientId(target.client_id);
    setPhotoUrl(target.images[0]?.image_url ?? null);
    setAudioDataUrl(null);
    setRetakingPhoto(false);
    setAiDebug(null);
    setSeriesDrawerOpen(false);
    setMode("preview");
  }

  /** Câmera → preview via lista Série (não auto-avança). */
  function openSeriesDrawer() {
    if (approved.length === 0 && !draft) return;
    setSeriesDrawerOpen(true);
  }

  function removeSeriesItem(clientId: string) {
    const before = seriesItems();
    const idx = before.findIndex((d) => d.client_id === clientId);
    const remaining = before.filter((d) => d.client_id !== clientId);

    setApproved((prev) => prev.filter((d) => d.client_id !== clientId));
    setPublishById((prev) => {
      const next = { ...prev };
      delete next[clientId];
      return next;
    });

    if (draft?.client_id !== clientId) {
      brandToast.message("Peça removida da série");
      return;
    }

    if (remaining.length === 0) {
      resetPiece();
      setMode("camera");
      brandToast.message("Série vazia — capture uma peça");
      return;
    }

    const nextItem =
      remaining[Math.min(Math.max(idx, 0), remaining.length - 1)]!;
    setDraft(nextItem);
    setClientId(nextItem.client_id);
    setPhotoUrl(nextItem.images[0]?.image_url ?? null);
    setAudioDataUrl(null);
    setMode("preview");
    brandToast.message("Peça removida da série");
  }

  function draftsToCommit(): IntakeDraftItem[] {
    // Keep current draft if user left preview via Refazer (record/confirm)
    // without approving — Finalizar still includes it until descartada.
    if (
      draft &&
      (mode === "preview" ||
        mode === "record" ||
        mode === "confirm" ||
        mode === "camera")
    ) {
      const already = approved.some((d) => d.client_id === draft.client_id);
      return already ? approved : [...approved, draft];
    }
    return approved;
  }

  function handleFinalize() {
    const items = draftsToCommit();
    if (items.length === 0) {
      brandToast.error("Aprove ao menos uma peça antes de finalizar");
      setExitConfirm(null);
      return;
    }
    if (!canFinalizeIntakeDrafts(items)) {
      brandToast.error("Cada peça precisa de foto");
      setExitConfirm(null);
      return;
    }
    setExitConfirm(null);
    setError(null);

    const prepared = items.map((item) => ({
      ...item,
      name: item.name.trim(),
      slug: item.slug.trim() || slugifyProductName(item.name),
      price: coerceMoney(item.price),
      compare_at_price: coerceMoney(item.compare_at_price),
      tags: item.tags ?? [],
      images: item.images,
      category_name: item.category_name ?? null,
      publish: Boolean(publishById[item.client_id]),
    }));

    startTransition(async () => {
      const result = await confirmIntakeBatchAction({ items: prepared });
      if (!result.ok) {
        setError(result.error);
        brandToast.error(result.error);
        return;
      }
      brandToast.success(
        `${result.created.length} peça(s) cadastrada(s) com sucesso`,
      );
      router.push("/admin/produtos");
    });
  }

  const series = seriesItems();
  const seriesIndex = draft
    ? series.findIndex((d) => d.client_id === draft.client_id)
    : -1;
  const pieceIndex =
    seriesIndex >= 0 ? seriesIndex + 1 : approved.length + 1;

  // —— Lobby (shell padrão visível) ——
  if (mode === "lobby") {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-8rem)] w-full max-w-lg flex-col items-center justify-center gap-8 px-4 py-10 text-center">
        <div className="rounded-full bg-[var(--brand-green)]/15 p-5">
          <Sparkles className="size-10 text-[var(--brand-green)]" />
        </div>
        <h2 className="text-xl font-semibold leading-snug">
          Cadastre em lote.
          <br />
          Uma peça por vez!
        </h2>
        <ul className="flex w-full max-w-xs flex-col gap-3 text-left">
          <li className="flex items-center gap-3 text-base text-foreground">
            <Camera className="size-5 shrink-0 text-[var(--brand-green)]" />
            <span>Foto</span>
          </li>
          <li className="flex items-center gap-3 text-base text-foreground">
            <Mic className="size-5 shrink-0 text-[var(--brand-green)]" />
            <span>Áudio</span>
          </li>
          <li className="flex items-center gap-3 text-base text-foreground">
            <Check className="size-5 shrink-0 text-[var(--brand-green)]" />
            <span>Revisar e confirmar</span>
          </li>
          <li className="flex items-center gap-3 text-base text-muted-foreground">
            <Repeat2 className="size-5 shrink-0 text-[var(--brand-green)]" />
            <span>Próxima</span>
          </li>
        </ul>
        {!aiConfigured ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            IA não configurada — o preview será manual após a foto/áudio.
          </p>
        ) : null}
        <Button
          type="button"
          className="h-12 w-full max-w-xs gap-2 rounded-xl text-base bg-[var(--brand-green)] hover:bg-[var(--brand-green)]/90"
          onClick={() => {
            resetPiece();
            setApproved([]);
            setPublishById({});
            setMode("camera");
          }}
        >
          Iniciar sessão
          <ArrowRight className="size-4" />
        </Button>
      </div>
    );
  }

  // —— Session chrome ——
  return (
    <div className="fixed inset-0 z-[60] flex flex-col overscroll-none bg-zinc-950 text-white">
      <header className="flex shrink-0 items-center justify-between px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          className="inline-flex h-10 items-center gap-1 rounded-xl px-2 text-sm text-white/80"
          onClick={() => {
            if (retakingPhoto && draft) {
              setRetakingPhoto(false);
              setMode("record");
              return;
            }
            setExitConfirm("cancel");
          }}
          disabled={pending || recording}
        >
          <X className="size-4" />
          {retakingPhoto ? "Voltar" : "Cancelar"}
        </button>
        <div className="flex flex-col items-center gap-1">
          <ModeDots mode={mode} />
          {recording ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-bold">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              Gravando {Math.floor(recMs / 1000)}s
            </span>
          ) : null}
        </div>
        {mode === "preview" ? (
          <button
            type="button"
            className="inline-flex h-10 items-center gap-1 rounded-xl px-2 text-sm font-medium text-[var(--brand-green)] disabled:opacity-40"
            onClick={() => setExitConfirm("finish")}
            disabled={pending || recording}
          >
            <Check className="size-4" />
            Finalizar
          </button>
        ) : approved.length > 0 ? (
          <button
            type="button"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl px-2 text-sm font-medium text-[var(--brand-green)] disabled:opacity-40"
            onClick={openSeriesDrawer}
            disabled={pending || recording || uploading}
            aria-label="Lista da série"
          >
            <List className="size-4" />
            Série
          </button>
        ) : (
          <span className="inline-flex h-10 min-w-[5.5rem]" aria-hidden />
        )}
      </header>

      {error ? (
        <p className="mx-3 mb-2 rounded-xl bg-red-500/20 px-3 py-2 text-xs text-red-100">
          {error}
        </p>
      ) : null}

      {mode === "camera" ? (
        <div className="relative min-h-0 flex-1 touch-none bg-zinc-900">
          <button
            type="button"
            disabled={uploading}
            onClick={() => cameraInputRef.current?.click()}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 pb-24 text-white/55 disabled:opacity-50"
            aria-label="Abrir câmera"
          >
            <span className="rounded-full bg-white/10 p-5 ring-1 ring-white/20">
              <Camera className="size-14" />
            </span>
            <p className="text-base font-semibold text-white/90">
              {uploading
                ? "Enviando foto…"
                : retakingPhoto
                  ? "Nova foto da peça"
                  : "Toque para fotografar"}
            </p>
            <p className="max-w-xs text-center text-sm leading-snug text-white/55">
              {retakingPhoto
                ? "Os campos preenchidos serão mantidos"
                : "Toque em qualquer lugar da tela para abrir a câmera do seu dispositivo."}
            </p>
          </button>
          <button
            type="button"
            disabled={uploading}
            className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center gap-1.5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 text-xs text-white/65 underline"
            onClick={() => galleryInputRef.current?.click()}
          >
            <Upload className="size-3.5" />
            {uploading ? "Enviando…" : "Escolher da galeria"}
          </button>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*,image/jpeg,image/png,image/webp,image/heic,image/heif"
            capture="environment"
            className="sr-only"
            disabled={uploading}
            onChange={(event) => {
              onPhotoFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*,image/jpeg,image/png,image/webp,image/heic,image/heif"
            className="sr-only"
            disabled={uploading}
            onChange={(event) => {
              onPhotoFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </div>
      ) : null}

      {mode === "record" || mode === "confirm" ? (
        mode === "confirm" ? (
          <div className="relative flex min-h-0 flex-1 flex-col">
            <div className="relative min-h-0 flex-1">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl}
                  alt=""
                  className="h-full w-full object-cover opacity-50"
                />
              ) : null}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-6 pb-8 text-center">
                <p className="text-sm font-semibold">
                  Áudio pronto · {Math.max(1, Math.floor(recMs / 1000))}s
                </p>
                <p className="mt-1 text-xs text-white/70">
                  Confirme para processar com IA (STT + LLM).
                </p>
              </div>
            </div>
            <div className="flex gap-2 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
              <button
                type="button"
                className="h-12 flex-1 rounded-2xl border border-white/30 text-sm font-medium"
                onClick={() => {
                  setAudioDataUrl(null);
                  setRecMs(0);
                  setMode("record");
                }}
              >
                Regravar
              </button>
              <button
                type="button"
                className="h-12 flex-[1.4] rounded-2xl bg-[var(--brand-green)] text-sm font-semibold text-white"
                onClick={confirmSendAudio}
              >
                Enviar para IA
              </button>
            </div>
          </div>
        ) : (
          <div className="relative flex min-h-0 flex-1 flex-col">
            <div className="absolute inset-0 bg-zinc-900">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>

            {recording ? (
              <div className="absolute inset-0 flex flex-col bg-red-600/88">
                <div className="flex min-h-0 flex-1 flex-col justify-end overflow-y-auto overscroll-contain px-3 pb-2 pt-2 touch-pan-y">
                  <VoiceScriptTip
                    checked={scriptChecked}
                    onToggle={(id) =>
                      setScriptChecked((prev) => ({
                        ...prev,
                        [id]: !prev[id],
                      }))
                    }
                    tone="dark"
                  />
                </div>
                <div className="shrink-0 px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
                  <button
                    type="button"
                    onClick={toggleRecording}
                    className="relative flex h-16 w-full flex-col items-center justify-center gap-1 rounded-2xl bg-white text-red-600 shadow-xl active:scale-[0.99]"
                    aria-label="Parar gravação"
                    aria-pressed
                  >
                    <span className="absolute inset-0 animate-ping rounded-2xl bg-white/30" />
                    <span className="relative flex items-center gap-2">
                      <Mic className="size-5 animate-pulse" />
                      <span className="text-sm font-bold leading-none">
                        Gravando… {Math.floor(recMs / 1000)}s
                      </span>
                    </span>
                    <span
                      className="relative flex h-7 items-end gap-1"
                      aria-hidden
                    >
                      {Array.from({ length: 16 }).map((_, i) => (
                        <span
                          key={i}
                          className="w-1.5 animate-pulse rounded-full bg-red-500/90"
                          style={{
                            height: `${10 + ((i * 17) % 28)}px`,
                            animationDelay: `${i * 45}ms`,
                          }}
                        />
                      ))}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-5 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-16">
                <button
                  type="button"
                  onClick={openManualPreview}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/25"
                  aria-label="Editar manualmente"
                  title="Editar"
                >
                  <Pencil className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={toggleRecording}
                  className="flex h-[4.25rem] w-[4.25rem] flex-col items-center justify-center rounded-full bg-red-600 text-white shadow-xl active:scale-95"
                  aria-label="Gravar áudio"
                >
                  <Mic className="size-7" />
                  <span className="text-[11px] font-bold">Gravar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExitConfirm("reshuffle")}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/25"
                  aria-label="Trocar foto"
                  title="Trocar foto"
                >
                  <Shuffle className="size-5" />
                </button>
              </div>
            )}
          </div>
        )
      ) : null}

      {mode === "working" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <Sparkles className="size-10 animate-pulse text-[var(--brand-green)]" />
          <p className="text-sm font-semibold">Processando STT + LLM…</p>
          <p className="text-xs text-white/50">Peça #{pieceIndex}</p>
        </div>
      ) : null}

      {mode === "preview" && draft ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-100 text-foreground">
          <div className="min-h-0 flex-1 overflow-hidden">
            <SessionDraftForm
              draft={draft}
              categories={categoryOptions}
              publish={Boolean(publishById[draft.client_id])}
              pieceIndex={pieceIndex}
              seriesTotal={Math.max(series.length, 1)}
              onChange={patchCurrentDraft}
              onCategoriesChange={setCategoryOptions}
              onPublishChange={(publish) =>
                setPublishById((prev) => ({
                  ...prev,
                  [draft.client_id]: publish,
                }))
              }
              onBackToRecord={() => {
                setRetakingPhoto(false);
                setMode("record");
              }}
              onOpenSeries={openSeriesDrawer}
              onRequestRemove={(clientId) => setRemoveTargetId(clientId)}
              aiDebug={aiDebug}
            />
          </div>
          <div className="flex shrink-0 items-center gap-2 border-t border-black/5 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              disabled={seriesIndex <= 0}
              onClick={() => jumpSeries(seriesIndex - 1)}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-foreground ring-1 ring-black/10 disabled:opacity-40"
              aria-label="Anterior"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              className="flex h-12 min-w-0 flex-1 items-center justify-center rounded-xl bg-[var(--brand-green)] text-base font-semibold text-white"
              onClick={approveAndNext}
            >
              Novo item
            </button>
            <button
              type="button"
              disabled={seriesIndex < 0 || seriesIndex >= series.length - 1}
              onClick={() => jumpSeries(seriesIndex + 1)}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-foreground ring-1 ring-black/10 disabled:opacity-40"
              aria-label="Próxima"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      ) : null}

      <IntakeSeriesDrawer
        open={seriesDrawerOpen}
        items={series}
        activeClientId={draft?.client_id ?? null}
        onClose={() => setSeriesDrawerOpen(false)}
        onSelect={jumpSeries}
        onRequestRemove={(clientId) => {
          setRemoveTargetId(clientId);
        }}
      />
      <IntakeRemoveConfirm
        open={Boolean(removeTargetId)}
        itemName={
          removeTargetId
            ? (series.find((d) => d.client_id === removeTargetId)?.name ?? null)
            : null
        }
        onCancel={() => setRemoveTargetId(null)}
        onConfirm={() => {
          if (!removeTargetId) return;
          const id = removeTargetId;
          setRemoveTargetId(null);
          setSeriesDrawerOpen(false);
          removeSeriesItem(id);
        }}
      />
      <ConfirmSheet
        open={exitConfirm === "cancel"}
        title="Cancelar sessão?"
        body="Descarta a peça em andamento e as aprovadas ainda não finalizadas. Nada será gravado."
        confirmLabel="Cancelar sessão"
        destructive
        onCancel={() => setExitConfirm(null)}
        onConfirm={resetSession}
      />
      <ConfirmSheet
        open={exitConfirm === "finish"}
        title="Finalizar e cadastrar?"
        body={`${draftsToCommit().length} peça(s) serão criadas (inativas, salvo “Publicar”). Você será levado a Produtos.`}
        confirmLabel={pending ? "Cadastrando…" : "Finalizar"}
        onCancel={() => setExitConfirm(null)}
        onConfirm={handleFinalize}
      />
      <ConfirmSheet
        open={exitConfirm === "reshuffle"}
        title="Trocar a foto?"
        body="A foto atual será descartada. Você captura outra e volta ao áudio."
        confirmLabel="Trocar foto"
        destructive
        onCancel={() => setExitConfirm(null)}
        onConfirm={() => {
          setExitConfirm(null);
          setPhotoUrl(null);
          setAudioDataUrl(null);
          setScriptChecked({});
          if (draft) setRetakingPhoto(true);
          setMode("camera");
        }}
      />
    </div>
  );
}

function ModeDots({ mode }: { mode: Mode }) {
  const step =
    mode === "camera"
      ? 0
      : mode === "record" || mode === "confirm"
        ? 1
        : 2;
  return (
    <div className="flex items-center gap-1.5" aria-label={`Passo ${step + 1}`}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 w-6 rounded-full",
            i === step ? "bg-white" : "bg-white/25",
          )}
        />
      ))}
    </div>
  );
}

function ConfirmSheet({
  open,
  title,
  body,
  confirmLabel,
  destructive,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal
        className="w-full max-w-sm rounded-3xl bg-white p-5 text-foreground shadow-2xl"
      >
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            className="h-12 flex-1 rounded-2xl border border-border text-sm font-medium"
            onClick={onCancel}
          >
            Voltar
          </button>
          <button
            type="button"
            className={cn(
              "h-12 flex-1 rounded-2xl text-sm font-semibold text-white",
              destructive
                ? "bg-[var(--brand-pink)]"
                : "bg-[var(--brand-green)]",
            )}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
