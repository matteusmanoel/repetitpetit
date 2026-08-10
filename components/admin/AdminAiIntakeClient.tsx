"use client";

/**
 * Cadastro em massa — sessão fullscreen (D137 / #185).
 * Fluxo: lobby → câmera → áudio → confirmar IA → preview edit → aprovar → próxima.
 * Finalizar → commit lote → /admin/produtos + toast.
 */

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Camera,
  Check,
  Mic,
  Sparkles,
  Square,
  Upload,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";

import { VoiceScriptTip, VOICE_SCRIPT_ITEMS } from "@/components/admin/VoiceScriptTip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  confirmIntakeBatchAction,
  generateIntakePreviewAction,
} from "@/features/admin/ai-intake/actions";
import {
  cameraErrorMessagePt,
  canFinalizeIntakeDrafts,
  classifyCameraError,
} from "@/features/admin/ai-intake/mass-capture";
import { validateIntakeDraft } from "@/features/admin/ai-intake/business-validator";
import { evaluatePublishGate } from "@/features/admin/ai-intake/category-match";
import {
  emptyIntakeDraft,
  type IntakeDraftItem,
} from "@/features/admin/ai-intake/schemas";
import {
  PRODUCT_CONDITION_LABELS,
  PRODUCT_CONDITIONS,
  PRODUCT_GENDER_LABELS,
  PRODUCT_GENDERS,
  PRODUCT_SIZE_LABELS,
  SIZE_GROUP_LABELS,
  SIZE_GROUPS,
  isProductSizeLabel,
  slugifyProductName,
} from "@/features/admin/product-constants";
import { createCategoryInlineAction } from "@/features/admin/product-dialog-actions";
import type { CategoryOption } from "@/features/admin/product-types";
import { FEATURED_BRANDS } from "@/features/storefront/nav";
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
  return crypto.randomUUID();
}

export function AdminAiIntakeClient({ categories, aiConfigured }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("lobby");
  const [categoryOptions, setCategoryOptions] =
    useState<CategoryOption[]>(categories);
  const [approved, setApproved] = useState<IntakeDraftItem[]>([]);
  const [publishById, setPublishById] = useState<Record<string, boolean>>({});
  const [clientId, setClientId] = useState(() => newClientId());
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [audioDataUrl, setAudioDataUrl] = useState<string | null>(null);
  const [draft, setDraft] = useState<IntakeDraftItem | null>(null);
  const [recording, setRecording] = useState(false);
  const [recMs, setRecMs] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [exitConfirm, setExitConfirm] = useState<"cancel" | "finish" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recTimer = useRef<number | null>(null);

  useEffect(() => {
    setCategoryOptions(categories);
  }, [categories]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (mode !== "camera") return;
    void (async () => {
      const mediaDevicesAvailable = Boolean(
        typeof navigator !== "undefined" &&
          navigator.mediaDevices?.getUserMedia,
      );
      const secure =
        typeof window !== "undefined" ? window.isSecureContext : true;
      if (!secure || !mediaDevicesAvailable) {
        const message = cameraErrorMessagePt("insecure_context");
        setCameraError(message);
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraError(null);
      } catch (err) {
        const kind = classifyCameraError(err, secure, mediaDevicesAvailable);
        const message = cameraErrorMessagePt(kind);
        setCameraError(message);
        toast.error(message);
      }
    })();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
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
  }

  function resetSession() {
    resetPiece();
    setApproved([]);
    setPublishById({});
    setExitConfirm(null);
    setMode("lobby");
  }

  async function uploadBlob(blob: Blob): Promise<string> {
    const body = new FormData();
    const file = new File([blob], `capture-${Date.now()}.jpg`, {
      type: blob.type || "image/jpeg",
    });
    body.set("file", file);
    body.set("bucket", "productImages");
    body.set("pathPrefix", "ai-intake");
    const response = await fetch("/api/upload", { method: "POST", body });
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
      setAudioDataUrl(null);
      setDraft(null);
      setMode("record");
      toast.message("Foto ok — grave o áudio da peça");
    } catch (uploadError) {
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : "Falha ao enviar foto.";
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }

  function snapFromCamera() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      toast.error("Aguarde a câmera carregar");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) void commitPhoto(blob);
      },
      "image/jpeg",
      0.85,
    );
  }

  function stopTracks() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function startRecording() {
    if (!photoUrl || recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunks.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorder.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.current.push(event.data);
      };
      recorder.start();
      setRecMs(0);
      setRecording(true);
    } catch {
      toast.error("Microfone indisponível");
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
        toast.message("Gravação vazia");
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
          toast.message("Preencha o preview manualmente");
        } else {
          setDraft(result.drafts[0]);
          if (result.warning) toast.message(result.warning);
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
        toast.error("Falha na IA — preencha manualmente");
        setMode("preview");
      }
    },
    [clientId, photoUrl],
  );

  function confirmSendAudio() {
    void runAi(audioDataUrl);
  }

  function skipAudioManual() {
    void runAi(null);
  }

  function approveAndNext() {
    if (!draft) return;
    if (!draft.images[0]?.image_url) {
      toast.error("Peça sem foto");
      return;
    }
    setApproved((prev) => [...prev, draft]);
    resetPiece();
    setMode("camera");
    toast.success("Peça aprovada — próxima");
  }

  function draftsToCommit(): IntakeDraftItem[] {
    if (mode === "preview" && draft) {
      const already = approved.some((d) => d.client_id === draft.client_id);
      return already ? approved : [...approved, draft];
    }
    return approved;
  }

  function handleFinalize() {
    const items = draftsToCommit();
    if (items.length === 0) {
      toast.error("Aprove ao menos uma peça antes de finalizar");
      setExitConfirm(null);
      return;
    }
    if (!canFinalizeIntakeDrafts(items)) {
      toast.error("Cada peça precisa de foto");
      setExitConfirm(null);
      return;
    }
    setExitConfirm(null);
    setError(null);

    const prepared = items.map((item) => ({
      ...item,
      name: item.name.trim(),
      slug: item.slug.trim() || slugifyProductName(item.name),
      price:
        typeof item.price === "string"
          ? Number(item.price.replace(",", "."))
          : item.price,
      compare_at_price:
        item.compare_at_price === "" || item.compare_at_price == null
          ? null
          : typeof item.compare_at_price === "string"
            ? Number(item.compare_at_price.replace(",", "."))
            : item.compare_at_price,
      tags: item.tags ?? [],
      images: item.images,
      category_name: item.category_name ?? null,
      publish: Boolean(publishById[item.client_id]),
    }));

    startTransition(async () => {
      const result = await confirmIntakeBatchAction({ items: prepared });
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success(
        `${result.created.length} peça(s) cadastrada(s) com sucesso`,
      );
      router.push("/admin/produtos");
    });
  }

  const pieceIndex = approved.length + 1;

  // —— Lobby (shell padrão visível) ——
  if (mode === "lobby") {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-6 px-4 py-10 text-center">
        <div className="rounded-full bg-[var(--brand-green)]/15 p-5">
          <Camera className="size-10 text-[var(--brand-green)]" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Sessão de cadastro</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Uma peça por vez: foto → áudio → confirmar → revisar → próxima.
            Finalizar grava o lote e volta para Produtos.
          </p>
        </div>
        {!aiConfigured ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            IA não configurada — o preview será manual após a foto/áudio.
          </p>
        ) : null}
        <Button
          type="button"
          className="h-12 w-full max-w-xs gap-2 bg-[var(--brand-green)] hover:bg-[var(--brand-green)]/90"
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
    <div className="fixed inset-0 z-[60] flex flex-col bg-zinc-950 text-white">
      <header className="flex items-center justify-between px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          className="inline-flex h-10 items-center gap-1 rounded-xl px-2 text-sm text-white/80"
          onClick={() => setExitConfirm("cancel")}
          disabled={pending || recording}
        >
          <X className="size-4" />
          Cancelar
        </button>
        <ModeDots mode={mode} />
        <button
          type="button"
          className="inline-flex h-10 items-center gap-1 rounded-xl px-2 text-sm font-medium text-[var(--brand-green)] disabled:opacity-40"
          onClick={() => setExitConfirm("finish")}
          disabled={pending || recording}
        >
          <Check className="size-4" />
          Finalizar
        </button>
      </header>

      {error ? (
        <p className="mx-3 mb-2 rounded-xl bg-red-500/20 px-3 py-2 text-xs text-red-100">
          {error}
        </p>
      ) : null}

      {mode === "camera" ? (
        <div className="relative flex flex-1 flex-col">
          <div className="relative flex-1 bg-zinc-800">
            <video
              ref={videoRef}
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-8 rounded-[2.5rem] border border-white/35" />
            {cameraError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-900/90 px-6 text-center">
                <Camera className="size-12 opacity-50" />
                <p className="text-sm text-white/80">{cameraError}</p>
              </div>
            ) : null}
          </div>
          <div className="flex flex-col items-center gap-3 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
            <p className="text-xs text-white/60">
              Peça #{pieceIndex} · Passo 1 · Foto
              {approved.length > 0
                ? ` · ${approved.length} aprovada(s)`
                : ""}
            </p>
            <button
              type="button"
              disabled={uploading}
              className="h-[4.75rem] w-[4.75rem] rounded-full border-[6px] border-white bg-white/20 disabled:opacity-50"
              onClick={snapFromCamera}
              aria-label="Capturar foto"
            />
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-xs text-white/70 underline"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="size-3.5" />
              {uploading ? "Enviando…" : "Enviar foto"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              capture="environment"
              className="sr-only"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void commitPhoto(file);
                event.target.value = "";
              }}
            />
          </div>
        </div>
      ) : null}

      {mode === "record" || mode === "confirm" ? (
        <div className="relative flex flex-1 flex-col">
          <div className="relative flex-1">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt=""
                className={cn(
                  "h-full w-full object-cover",
                  recording && "opacity-60",
                )}
              />
            ) : null}
            {recording ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-red-700/75">
                <div className="flex h-16 items-end gap-1">
                  {Array.from({ length: 14 }).map((_, i) => (
                    <span
                      key={i}
                      className="w-1.5 animate-pulse rounded-full bg-white"
                      style={{
                        height: `${10 + ((i * 19) % 36)}px`,
                        animationDelay: `${i * 40}ms`,
                      }}
                    />
                  ))}
                </div>
                <p className="text-lg font-bold tracking-wide">
                  Gravando… {Math.floor(recMs / 1000)}s
                </p>
                <ul className="flex max-w-xs flex-wrap justify-center gap-1.5 px-4">
                  {VOICE_SCRIPT_ITEMS.slice(0, 6).map((item) => (
                    <li
                      key={item.id}
                      className="rounded-full bg-white/15 px-2 py-0.5 text-[10px]"
                    >
                      {item.label}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {mode === "confirm" && !recording ? (
              <div className="absolute inset-0 flex flex-col items-center justify-end bg-gradient-to-t from-black/85 via-black/35 to-transparent p-6 pb-8">
                <p className="mb-1 text-sm font-semibold">Áudio pronto</p>
                <p className="mb-4 text-center text-xs text-white/70">
                  Confirme para processar com IA (STT + LLM). Evita envios
                  acidentais.
                </p>
              </div>
            ) : null}
          </div>

          <div className="relative flex flex-col items-center gap-3 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
            {mode === "record" && !recording ? (
              <>
                <p className="text-xs text-white/60">
                  Peça #{pieceIndex} · Passo 2 · Áudio
                </p>
                <div className="relative">
                  <VoiceScriptTip visible />
                  <button
                    type="button"
                    onClick={toggleRecording}
                    className="flex h-16 w-16 flex-col items-center justify-center rounded-full bg-red-600 shadow-xl"
                    aria-label="Gravar áudio"
                  >
                    <Mic className="size-6" />
                    <span className="text-[9px] font-bold">Gravar</span>
                  </button>
                </div>
                <button
                  type="button"
                  className="text-xs text-white/60 underline"
                  onClick={skipAudioManual}
                >
                  Sem áudio — preencher manual
                </button>
                <button
                  type="button"
                  className="text-xs text-white/50 underline"
                  onClick={() => {
                    setPhotoUrl(null);
                    setMode("camera");
                  }}
                >
                  Trocar foto
                </button>
              </>
            ) : null}

            {recording ? (
              <button
                type="button"
                onClick={toggleRecording}
                className="flex h-16 min-w-16 flex-col items-center justify-center rounded-full bg-white text-zinc-900 shadow-xl"
                aria-label="Parar gravação"
                aria-pressed
              >
                <Square className="size-5 fill-current" />
                <span className="text-[9px] font-bold">Parar</span>
              </button>
            ) : null}

            {mode === "confirm" ? (
              <div className="flex w-full max-w-sm gap-2">
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
            ) : null}
          </div>
        </div>
      ) : null}

      {mode === "working" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <Sparkles className="size-10 animate-pulse text-[var(--brand-green)]" />
          <p className="text-sm font-semibold">Processando STT + LLM…</p>
          <p className="text-xs text-white/50">Peça #{pieceIndex}</p>
        </div>
      ) : null}

      {mode === "preview" && draft ? (
        <div className="flex flex-1 flex-col overflow-hidden bg-zinc-100 text-foreground">
          <div className="border-b border-black/5 bg-white px-4 py-2 text-xs text-muted-foreground">
            Peça #{pieceIndex} · Passo 3 · Revisar e editar
            {approved.length > 0
              ? ` · ${approved.length} já aprovada(s)`
              : ""}
          </div>
          <div className="flex-1 overflow-y-auto p-4 pb-28">
            <SessionDraftForm
              draft={draft}
              categories={categoryOptions}
              publish={Boolean(publishById[draft.client_id])}
              onChange={(patch) => setDraft({ ...draft, ...patch })}
              onCategoriesChange={setCategoryOptions}
              onPublishChange={(publish) =>
                setPublishById((prev) => ({
                  ...prev,
                  [draft.client_id]: publish,
                }))
              }
              onRegenerate={() => {
                if (audioDataUrl) void runAi(audioDataUrl);
                else toast.message("Sem áudio para regenerar");
              }}
            />
          </div>
          <div className="border-t border-black/5 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--brand-green)] text-sm font-semibold text-white"
              onClick={approveAndNext}
            >
              <Check className="size-4" />
              Aprovar · próxima peça
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      ) : null}

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

function SessionDraftForm({
  draft,
  categories,
  publish,
  onChange,
  onCategoriesChange,
  onPublishChange,
  onRegenerate,
}: {
  draft: IntakeDraftItem;
  categories: CategoryOption[];
  publish: boolean;
  onChange: (patch: Partial<IntakeDraftItem>) => void;
  onCategoriesChange: (next: CategoryOption[]) => void;
  onPublishChange: (publish: boolean) => void;
  onRegenerate: () => void;
}) {
  const [creatingBrand, setCreatingBrand] = useState(false);
  const [newBrand, setNewBrand] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [creatingCatPending, setCreatingCatPending] = useState(false);

  const brandOptions = useMemo(() => {
    const fromDraft = draft.brand?.trim();
    return Array.from(
      new Set([...FEATURED_BRANDS, ...(fromDraft ? [fromDraft] : [])]),
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [draft.brand]);

  const cover = draft.images[0]?.image_url ?? null;
  const conflicts = validateIntakeDraft(draft);
  const hasConflict = conflicts.length > 0;
  const gate = evaluatePublishGate({
    name: draft.name,
    price: draft.price,
    size_label: draft.size_label,
    images: draft.images,
    hasConflict,
  });

  async function handleCreateCategory() {
    const trimmed = newCatName.trim();
    if (!trimmed) {
      toast.error("Informe o nome da categoria.");
      return;
    }
    setCreatingCatPending(true);
    try {
      const result = await createCategoryInlineAction(trimmed);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onCategoriesChange([...categories, result.category]);
      onChange({ category_id: result.category.id });
      setNewCatName("");
      setCreatingCat(false);
      toast.success("Categoria criada");
    } finally {
      setCreatingCatPending(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-muted">
        {cover ? (
          <Image
            src={cover}
            alt={draft.name || "Peça"}
            fill
            unoptimized
            className="object-cover"
            sizes="100vw"
          />
        ) : null}
      </div>

      {hasConflict ? (
        <p className="text-xs text-amber-700" role="status">
          ⚠ {conflicts[0]?.message} — revise antes de publicar
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2 text-xs"
          onClick={onRegenerate}
        >
          <Sparkles className="size-3.5" />
          Regenerar
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Nome *</Label>
          <Input
            value={draft.name}
            onChange={(event) => {
              const name = event.target.value;
              onChange({ name, slug: slugifyProductName(name) });
            }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Preço (R$)</Label>
          <Input
            inputMode="decimal"
            value={draft.price ?? ""}
            onChange={(event) => onChange({ price: event.target.value })}
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Tamanho</Label>
          <Select
            value={
              isProductSizeLabel(draft.size_label) ? draft.size_label : undefined
            }
            onValueChange={(value) => {
              if (value && isProductSizeLabel(value)) {
                onChange({ size_label: value });
              }
            }}
          >
            <SelectTrigger className="w-full" size="sm">
              <SelectValue placeholder="RN, P, M ou G" />
            </SelectTrigger>
            <SelectContent>
              {PRODUCT_SIZE_LABELS.map((label) => (
                <SelectItem key={label} value={label}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Marca</Label>
          <Select
            value={creatingBrand ? "__new__" : (draft.brand ?? "none")}
            onValueChange={(value) => {
              if (value === "__new__") {
                setCreatingBrand(true);
                setNewBrand(draft.brand ?? "");
                return;
              }
              setCreatingBrand(false);
              onChange({ brand: value === "none" ? null : value });
            }}
          >
            <SelectTrigger className="w-full" size="sm">
              <SelectValue placeholder="Sem marca" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem marca</SelectItem>
              {brandOptions.map((brand) => (
                <SelectItem key={brand} value={brand}>
                  {brand}
                </SelectItem>
              ))}
              <SelectItem value="__new__">+ Nova marca…</SelectItem>
            </SelectContent>
          </Select>
          {creatingBrand ? (
            <div className="mt-1 flex gap-1.5">
              <Input
                placeholder="Nome da marca"
                value={newBrand}
                onChange={(event) => setNewBrand(event.target.value)}
                className="h-8"
              />
              <Button
                type="button"
                size="sm"
                className="h-8 shrink-0 px-2.5"
                onClick={() => {
                  const trimmed = newBrand.trim();
                  if (!trimmed) {
                    toast.error("Informe o nome da marca.");
                    return;
                  }
                  onChange({ brand: trimmed });
                  setCreatingBrand(false);
                }}
              >
                Usar
              </Button>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Grupo</Label>
          <Select
            value={draft.size_group}
            onValueChange={(value) =>
              onChange({
                size_group: value as IntakeDraftItem["size_group"],
              })
            }
          >
            <SelectTrigger className="w-full" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SIZE_GROUPS.map((group) => (
                <SelectItem key={group} value={group}>
                  {SIZE_GROUP_LABELS[group]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Gênero</Label>
          <Select
            value={draft.gender}
            onValueChange={(value) =>
              onChange({ gender: value as IntakeDraftItem["gender"] })
            }
          >
            <SelectTrigger className="w-full" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRODUCT_GENDERS.map((gender) => (
                <SelectItem key={gender} value={gender}>
                  {PRODUCT_GENDER_LABELS[gender]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Condição</Label>
          <Select
            value={draft.condition}
            onValueChange={(value) =>
              onChange({
                condition: value as IntakeDraftItem["condition"],
              })
            }
          >
            <SelectTrigger className="w-full" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRODUCT_CONDITIONS.map((condition) => (
                <SelectItem key={condition} value={condition}>
                  {PRODUCT_CONDITION_LABELS[condition]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2 flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Categoria</Label>
          <Select
            value={creatingCat ? "__new__" : (draft.category_id ?? "none")}
            onValueChange={(value) => {
              if (value === "__new__") {
                setCreatingCat(true);
                return;
              }
              setCreatingCat(false);
              onChange({ category_id: value === "none" ? null : value });
            }}
          >
            <SelectTrigger className="w-full" size="sm">
              <SelectValue placeholder="Sem categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem categoria</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
              <SelectItem value="__new__">+ Criar categoria…</SelectItem>
            </SelectContent>
          </Select>
          {creatingCat ? (
            <div className="mt-1 flex gap-1.5">
              <Input
                placeholder="Nome da categoria"
                value={newCatName}
                onChange={(event) => setNewCatName(event.target.value)}
                disabled={creatingCatPending}
                className="h-8"
              />
              <Button
                type="button"
                size="sm"
                className="h-8 shrink-0 px-2.5"
                disabled={creatingCatPending}
                onClick={() => void handleCreateCategory()}
              >
                {creatingCatPending ? "…" : "Criar"}
              </Button>
            </div>
          ) : null}
        </div>

        <div className="col-span-2 flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Descrição</Label>
          <Textarea
            value={draft.description ?? ""}
            className="min-h-16 resize-none"
            rows={3}
            onChange={(event) =>
              onChange({ description: event.target.value || null })
            }
          />
        </div>
      </div>

      <label
        className={cn(
          "flex items-start gap-3 rounded-xl border px-3 py-2.5",
          gate.ok
            ? "border-[var(--brand-green)]/30 bg-[var(--brand-green)]/5"
            : "border-border bg-muted/30 opacity-80",
        )}
      >
        <input
          type="checkbox"
          className="mt-1 size-4 accent-[var(--brand-green)]"
          checked={publish}
          disabled={!gate.ok}
          onChange={(e) => onPublishChange(e.target.checked)}
        />
        <span className="min-w-0">
          <span className="block text-sm font-medium">Publicar no catálogo</span>
          <span className="block text-[11px] text-muted-foreground">
            {gate.ok
              ? "Produto entra como disponível."
              : `Desabilitado: ${gate.reasons.join(", ")}. Finalizar grava como inativo.`}
          </span>
        </span>
      </label>
    </div>
  );
}
