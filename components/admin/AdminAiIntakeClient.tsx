"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Camera,
  Check,
  CheckCircle2,
  Mic,
  MicOff,
  Pencil,
  Sparkles,
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
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { toast } from "sonner";

import { AdminLabelPrintQueue } from "@/components/admin/AdminLabelPrintQueue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
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
  allIntakeDraftsReady,
  cameraErrorMessagePt,
  classifyCameraError,
  generatePreviewCtaLabel,
  isHoldLockPointer,
  resolveHoldLockHint,
  shouldCancelOnRelease,
  shouldLockFromDelta,
  type MicHint,
} from "@/features/admin/ai-intake/mass-capture";
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
import { formatPrice } from "@/features/catalog/format-price";
import { FEATURED_BRANDS } from "@/features/storefront/nav";
import type { Database } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type Job = Database["public"]["Tables"]["label_print_jobs"]["Row"];

type CaptureSlot = {
  client_id: string;
  image_url: string | null;
  audio_data_url: string | null;
  audio_note: string;
  has_audio: boolean;
  ai_status: "idle" | "running" | "done" | "manual";
};

type TabId = "captura" | "preview";

type Props = {
  categories: CategoryOption[];
  aiConfigured: boolean;
};

function newClientId(): string {
  return crypto.randomUUID();
}

function blankSlot(): CaptureSlot {
  return {
    client_id: newClientId(),
    image_url: null,
    audio_data_url: null,
    audio_note: "",
    has_audio: false,
    ai_status: "idle",
  };
}

export function AdminAiIntakeClient({ categories, aiConfigured }: Props) {
  const [tab, setTab] = useState<TabId>("captura");
  const [seriesClosed, setSeriesClosed] = useState(false);
  const [slots, setSlots] = useState<CaptureSlot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<IntakeDraftItem[]>([]);
  const [previewMode, setPreviewMode] = useState<"ai" | "manual" | null>(null);
  const [categoryOptions, setCategoryOptions] =
    useState<CategoryOption[]>(categories);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [createdSummary, setCreatedSummary] = useState<
    Array<{ staffCode: string; productId: string }>
  >([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const aiInflight = useRef(new Set<string>());

  useEffect(() => {
    setCategoryOptions(categories);
  }, [categories]);

  const activeSlot =
    (selectedId
      ? slots.find((s) => s.client_id === selectedId)
      : undefined) ??
    slots[slots.length - 1] ??
    null;

  const capturedSlots = slots.filter((s) => s.image_url);
  const canFinalize =
    seriesClosed &&
    tab === "preview" &&
    allIntakeDraftsReady(drafts) &&
    !pending &&
    !batchId;

  const patchSlot = useCallback(
    (clientId: string, patch: Partial<CaptureSlot>) => {
      setSlots((prev) =>
        prev.map((s) => (s.client_id === clientId ? { ...s, ...patch } : s)),
      );
    },
    [],
  );

  const upsertDraft = useCallback((draft: IntakeDraftItem) => {
    setDrafts((prev) => {
      const idx = prev.findIndex((d) => d.client_id === draft.client_id);
      if (idx === -1) return [...prev, draft];
      const next = [...prev];
      next[idx] = { ...next[idx], ...draft, images: draft.images };
      return next;
    });
  }, []);

  const runAiForSlot = useCallback(
    async (slot: CaptureSlot) => {
      if (!slot.image_url) return;
      if (aiInflight.current.has(slot.client_id)) return;
      aiInflight.current.add(slot.client_id);
      patchSlot(slot.client_id, { ai_status: "running" });

      try {
        const result = await generateIntakePreviewAction({
          items: [
            {
              client_id: slot.client_id,
              images: [{ image_url: slot.image_url, alt_text: null }],
              audio_data_url: slot.audio_data_url,
              audio_note: slot.audio_note.trim() || null,
            },
          ],
        });
        if (!result.ok) {
          upsertDraft(
            emptyIntakeDraft({
              client_id: slot.client_id,
              images: [{ image_url: slot.image_url, alt_text: null }],
              audio_note: slot.audio_note || null,
            }),
          );
          patchSlot(slot.client_id, { ai_status: "manual" });
          return;
        }
        const draft = result.drafts[0];
        if (draft) upsertDraft(draft);
        setPreviewMode((mode) => mode ?? result.mode);
        if (result.warning) setWarning(result.warning);
        patchSlot(slot.client_id, {
          ai_status: result.mode === "ai" ? "done" : "manual",
        });
      } catch {
        upsertDraft(
          emptyIntakeDraft({
            client_id: slot.client_id,
            images: [{ image_url: slot.image_url!, alt_text: null }],
            audio_note: slot.audio_note || null,
          }),
        );
        patchSlot(slot.client_id, { ai_status: "manual" });
      } finally {
        aiInflight.current.delete(slot.client_id);
      }
    },
    [patchSlot, upsertDraft],
  );

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (!cameraOn || tab !== "captura" || seriesClosed) return;
    void (async () => {
      const mediaDevicesAvailable = Boolean(
        typeof navigator !== "undefined" &&
          navigator.mediaDevices?.getUserMedia,
      );
      const secure =
        typeof window !== "undefined" ? window.isSecureContext : true;

      if (!secure || !mediaDevicesAvailable) {
        const message = cameraErrorMessagePt("insecure_context");
        setCameraOn(false);
        setCameraError(message);
        toast.error(message);
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
        setCameraOn(false);
        setCameraError(message);
        toast.error(message);
      }
    })();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [cameraOn, tab, seriesClosed]);

  async function uploadBlob(blob: Blob, pathPrefix: string): Promise<string> {
    const body = new FormData();
    const file = new File([blob], `capture-${Date.now()}.jpg`, {
      type: blob.type || "image/jpeg",
    });
    body.set("file", file);
    body.set("bucket", "productImages");
    body.set("pathPrefix", pathPrefix);
    const response = await fetch("/api/upload", {
      method: "POST",
      body,
    });
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
      const url = await uploadBlob(blob, "ai-intake");
      const target =
        activeSlot && !activeSlot.image_url ? activeSlot : blankSlot();
      const nextSlot: CaptureSlot = {
        ...target,
        image_url: url,
        ai_status: aiConfigured ? "running" : "manual",
      };

      setSlots((prev) => {
        if (activeSlot && !activeSlot.image_url) {
          return prev.map((s) =>
            s.client_id === activeSlot.client_id ? nextSlot : s,
          );
        }
        return [...prev, nextSlot];
      });
      setSelectedId(nextSlot.client_id);
      setSeriesClosed(false);
      upsertDraft(
        emptyIntakeDraft({
          client_id: nextSlot.client_id,
          images: [{ image_url: url, alt_text: null }],
        }),
      );
      toast.message(
        "Foto capturada — grave o áudio (opcional) ou tire a próxima",
      );
      void runAiForSlot(nextSlot);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Falha ao enviar foto.",
      );
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

  function attachAudio(clientId: string, dataUrl: string) {
    const note = "[áudio gravado]";
    setSlots((prev) =>
      prev.map((s) =>
        s.client_id === clientId
          ? {
              ...s,
              audio_data_url: dataUrl,
              has_audio: true,
              audio_note: s.audio_note || note,
            }
          : s,
      ),
    );
    setDrafts((prev) =>
      prev.map((d) =>
        d.client_id === clientId
          ? {
              ...d,
              audio_note: d.audio_note || note,
              description: d.description || note,
            }
          : d,
      ),
    );
    const slot = slots.find((s) => s.client_id === clientId);
    if (slot?.image_url) {
      void runAiForSlot({
        ...slot,
        audio_data_url: dataUrl,
        has_audio: true,
        audio_note: slot.audio_note || note,
      });
    }
    toast.success(
      "Áudio ok — tire a próxima foto ou toque em Gerar preview",
    );
    setSelectedId(null);
  }

  function ensureManualDrafts() {
    const withPhoto = slots.filter((s) => s.image_url);
    setDrafts((prev) => {
      const byId = new Map(prev.map((d) => [d.client_id, d]));
      return withPhoto.map((s) => {
        const existing = byId.get(s.client_id);
        if (existing) {
          return {
            ...existing,
            images: [{ image_url: s.image_url!, alt_text: null }],
            audio_note: s.audio_note || existing.audio_note || null,
          };
        }
        return emptyIntakeDraft({
          client_id: s.client_id,
          images: [{ image_url: s.image_url!, alt_text: null }],
          audio_note: s.audio_note || null,
        });
      });
    });
  }

  function endSeriesAndPreview() {
    if (capturedSlots.length === 0) {
      toast.error("Capture ao menos uma foto");
      return;
    }
    ensureManualDrafts();
    setSeriesClosed(true);
    setTab("preview");
    setCameraOn(false);
    if (!aiConfigured) {
      setPreviewMode("manual");
      setWarning(
        "IA não configurada — preencha o preview manualmente e toque em Finalizar.",
      );
      toast.message("Preview manual aberto — revise e finalize");
    } else {
      const pendingAi = capturedSlots.some(
        (s) => s.ai_status === "idle" || s.ai_status === "running",
      );
      toast.message(
        pendingAi
          ? "Gerando preview IA — revise os campos e finalize"
          : "Preview pronto — revise e toque em Finalizar",
      );
    }
    // Kick remaining AI best-effort without blocking preview
    for (const slot of capturedSlots) {
      if (slot.ai_status === "idle" || slot.ai_status === "running") {
        void runAiForSlot(slot);
      }
    }
  }

  function updateDraft(clientId: string, patch: Partial<IntakeDraftItem>) {
    setDrafts((prev) =>
      prev.map((d) => (d.client_id === clientId ? { ...d, ...patch } : d)),
    );
  }

  function handleConfirm() {
    if (!allIntakeDraftsReady(drafts)) return;
    setError(null);
    setConfirmOpen(false);

    const prepared = drafts.map((draft) => ({
      ...draft,
      name: draft.name.trim(),
      slug: draft.slug.trim() || slugifyProductName(draft.name),
      price:
        typeof draft.price === "string"
          ? Number(draft.price.replace(",", "."))
          : draft.price,
      compare_at_price:
        draft.compare_at_price === "" || draft.compare_at_price == null
          ? null
          : typeof draft.compare_at_price === "string"
            ? Number(draft.compare_at_price.replace(",", "."))
            : draft.compare_at_price,
      tags: draft.tags ?? [],
      images: draft.images,
    }));

    startTransition(async () => {
      const result = await confirmIntakeBatchAction({ items: prepared });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBatchId(result.batchId);
      setJobs(result.jobs);
      setCreatedSummary(
        result.created.map((c) => ({
          staffCode: c.staffCode,
          productId: c.productId,
        })),
      );
      toast.success(
        `${result.created.length} peça(s) cadastrada(s)`,
      );
    });
  }

  function resetSession() {
    setBatchId(null);
    setJobs([]);
    setDrafts([]);
    setCreatedSummary([]);
    setSlots([]);
    setSelectedId(null);
    setSeriesClosed(false);
    setTab("captura");
    setPreviewMode(null);
    setWarning(null);
    setError(null);
    setConfirmOpen(false);
    setCameraOn(false);
    setCameraError(null);
  }

  if (batchId) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-heading text-base font-extrabold">
            Peças cadastradas
          </h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {createdSummary.map((row) => (
              <li key={row.productId}>
                <Link
                  href={`/admin/produtos/${row.productId}`}
                  className="font-mono underline-offset-2 hover:underline"
                >
                  {row.staffCode}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <AdminLabelPrintQueue batchId={batchId} initialJobs={jobs} />
        <Button type="button" variant="outline" onClick={resetSession}>
          Nova série em massa
        </Button>
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex w-fit gap-0 rounded-2xl bg-black/5 p-1">
          {(
            [
              { id: "captura" as const, label: "Captura" },
              {
                id: "preview" as const,
                label:
                  !seriesClosed && capturedSlots.length > 0
                    ? aiConfigured
                      ? `Gerar preview (${capturedSlots.length})`
                      : `Abrir preview (${capturedSlots.length})`
                    : `Preview (${capturedSlots.length})`,
              },
            ] as const
          ).map((t) => {
            const previewBlocked =
              t.id === "preview" && capturedSlots.length === 0;
            return (
              <button
                key={t.id}
                type="button"
                disabled={previewBlocked}
                onClick={() => {
                  if (t.id === "preview") {
                    if (seriesClosed) {
                      setTab("preview");
                      return;
                    }
                    endSeriesAndPreview();
                    return;
                  }
                  setTab("captura");
                }}
                className={cn(
                  "inline-flex h-11 items-center rounded-xl px-4 text-sm font-medium transition",
                  tab === t.id
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground",
                  previewBlocked && "cursor-not-allowed opacity-45",
                )}
                title={
                  previewBlocked
                    ? "Capture ao menos uma foto para abrir o preview"
                    : !seriesClosed && t.id === "preview"
                      ? "Encerra a série e gera o preview editável"
                      : undefined
                }
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={!canFinalize}
          onClick={() => setConfirmOpen(true)}
          className="h-11 shrink-0 gap-2 px-4 border-[var(--brand-green)]/40 text-[var(--brand-green)]"
          title={
            canFinalize
              ? undefined
              : tab !== "preview"
                ? "Primeiro gere o preview e preencha os campos obrigatórios"
                : "Preencha nome, preço e tamanho em todas as peças"
          }
        >
          <CheckCircle2 className="size-4" />
          Finalizar
        </Button>
      </div>

      {error ? (
        <p
          className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {warning ? (
        <p
          className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
          role="status"
        >
          {warning}
        </p>
      ) : null}

      {tab === "captura" ? (
        <CapturePane
          slots={slots}
          activeSlot={activeSlot}
          cameraOn={cameraOn}
          cameraError={cameraError}
          uploading={uploading}
          aiConfigured={aiConfigured}
          videoRef={videoRef}
          fileRef={fileRef}
          onOpenCamera={() => {
            setCameraError(null);
            setCameraOn(true);
          }}
          onSnap={snapFromCamera}
          onSelectSlot={setSelectedId}
          onFile={(file) => {
            if (file) void commitPhoto(file);
          }}
          onAttachAudio={attachAudio}
          onEndSeries={endSeriesAndPreview}
          capturedCount={capturedSlots.length}
        />
      ) : (
        <PreviewPane
          drafts={drafts}
          categories={categoryOptions}
          onChange={updateDraft}
          onCategoriesChange={setCategoryOptions}
        />
      )}

      {confirmOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-semibold">
              Confirmar cadastro em lote?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {drafts.length} peça(s) serão criadas com código RP e entram na
              fila de etiquetas.
            </p>
            <div className="mt-5 flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-12 flex-1"
                onClick={() => setConfirmOpen(false)}
              >
                Voltar
              </Button>
              <Button
                type="button"
                className="h-12 flex-1 bg-[var(--brand-green)] hover:bg-[var(--brand-green)]/90"
                disabled={pending}
                onClick={handleConfirm}
              >
                {pending ? "Cadastrando…" : "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CapturePane({
  slots,
  activeSlot,
  cameraOn,
  cameraError,
  uploading,
  aiConfigured,
  videoRef,
  fileRef,
  onOpenCamera,
  onSnap,
  onSelectSlot,
  onFile,
  onAttachAudio,
  onEndSeries,
  capturedCount,
}: {
  slots: CaptureSlot[];
  activeSlot: CaptureSlot | null;
  cameraOn: boolean;
  cameraError: string | null;
  uploading: boolean;
  aiConfigured: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  fileRef: RefObject<HTMLInputElement | null>;
  onOpenCamera: () => void;
  onSnap: () => void;
  onSelectSlot: (id: string) => void;
  onFile: (file: File | null) => void;
  onAttachAudio: (clientId: string, dataUrl: string) => void;
  onEndSeries: () => void;
  capturedCount: number;
}) {
  const previewCta = generatePreviewCtaLabel({
    aiConfigured,
    capturedCount,
  });

  return (
    <div className="flex min-h-[min(70dvh,36rem)] flex-col gap-3 overflow-hidden">
      {/* Reserved strip — always present to avoid layout jump */}
      <div className="h-[4.5rem] shrink-0">
        <ul className="flex h-full gap-2 overflow-x-auto rounded-2xl border border-dashed border-black/10 bg-white/60 px-2 py-2">
          {slots.length === 0 ? (
            <li className="flex h-full flex-1 items-center justify-center text-xs text-muted-foreground">
              Série vazia — as miniaturas aparecem aqui
            </li>
          ) : (
            slots.map((slot, idx) => {
              const active = slot.client_id === activeSlot?.client_id;
              return (
                <li key={slot.client_id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => onSelectSlot(slot.client_id)}
                    className={cn(
                      "relative h-full w-14 overflow-hidden rounded-xl ring-2",
                      active
                        ? "ring-[var(--brand-green)]"
                        : "ring-transparent",
                    )}
                  >
                    {slot.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={slot.image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center bg-muted text-[10px]">
                        —
                      </span>
                    )}
                    <span className="absolute left-1 top-1 rounded bg-black/50 px-1 text-[9px] text-white">
                      {idx + 1}
                    </span>
                    <span
                      className={cn(
                        "absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full",
                        slot.has_audio
                          ? "bg-[var(--brand-green)] text-white"
                          : "bg-black/55 text-white",
                      )}
                    >
                      {slot.has_audio ? (
                        <Mic className="size-3" />
                      ) : (
                        <MicOff className="size-3" />
                      )}
                    </span>
                    {slot.ai_status === "running" ? (
                      <Sparkles className="absolute inset-0 m-auto size-4 text-white drop-shadow" />
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-3xl bg-zinc-900">
        {cameraOn ? (
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-4 text-center text-white">
            <Camera className="size-12 opacity-80" />
            <button
              type="button"
              className="h-12 rounded-2xl bg-white px-6 text-sm font-semibold text-foreground"
              onClick={onOpenCamera}
            >
              Abrir câmera
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-sm underline opacity-80"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="size-3.5" />
              {uploading ? "Enviando…" : "Enviar foto"}
            </button>
            <p className="max-w-xs text-xs text-white/70">
              No celular: permita a câmera quando o navegador pedir. A câmera
              exige HTTPS (ou localhost).
            </p>
            {cameraError ? (
              <p
                className="max-w-sm rounded-xl bg-white/10 px-3 py-2 text-xs text-white"
                role="alert"
              >
                {cameraError}
              </p>
            ) : null}
          </div>
        )}
        {cameraOn ? (
          <button
            type="button"
            onClick={onSnap}
            disabled={uploading}
            className="absolute bottom-5 left-1/2 h-[4.25rem] w-[4.25rem] -translate-x-1/2 rounded-full border-[5px] border-white bg-white/25 disabled:opacity-50"
            aria-label="Capturar foto"
          />
        ) : null}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          capture="environment"
          className="sr-only"
          disabled={uploading}
          onChange={(event) => {
            onFile(event.target.files?.[0] ?? null);
            event.target.value = "";
          }}
        />
      </div>

      <p className="min-h-5 shrink-0 text-center text-sm text-muted-foreground">
        {activeSlot?.image_url ? (
          <>
            Slot{" "}
            <strong className="text-foreground">
              #
              {slots.findIndex((s) => s.client_id === activeSlot.client_id) + 1}
            </strong>
            {activeSlot.has_audio ? " · áudio ✓" : " · áudio opcional"}
            {activeSlot.ai_status === "running" ? " · IA…" : null}
          </>
        ) : (
          "Capture a foto; em seguida segure o microfone (mobile) ou toque (desktop)"
        )}
      </p>

      <div className="flex shrink-0 items-center justify-between gap-3 pb-2">
        <Button
          type="button"
          className="h-12 min-w-0 flex-1 bg-[var(--brand-green)] text-white hover:bg-[var(--brand-green)]/90"
          disabled={capturedCount === 0 || uploading}
          onClick={onEndSeries}
        >
          <Sparkles className="mr-1.5 size-4 shrink-0" />
          <span className="truncate">{previewCta}</span>
        </Button>
        <HoldLockMic
          disabled={!activeSlot?.image_url || uploading}
          onRecorded={(dataUrl) => {
            if (activeSlot) onAttachAudio(activeSlot.client_id, dataUrl);
          }}
        />
      </div>
    </div>
  );
}

function HoldLockMic({
  disabled,
  onRecorded,
}: {
  disabled: boolean;
  onRecorded: (dataUrl: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [locked, setLocked] = useState(false);
  const [holdMs, setHoldMs] = useState(0);
  const [hint, setHint] = useState<MicHint>("none");
  const [desktopArmed, setDesktopArmed] = useState(false);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const holdTimer = useRef<number | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const modeRef = useRef<"hold" | "tap" | null>(null);

  function clearTimer() {
    if (holdTimer.current) {
      window.clearInterval(holdTimer.current);
      holdTimer.current = null;
    }
  }

  function stopTracks() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function startRecorder(): Promise<boolean> {
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
      return true;
    } catch {
      toast.error("Microfone indisponível");
      return false;
    }
  }

  function finish(ok: boolean) {
    clearTimer();
    setRecording(false);
    setLocked(false);
    setHoldMs(0);
    setHint("none");
    setDesktopArmed(false);
    origin.current = null;
    modeRef.current = null;

    const recorder = mediaRecorder.current;
    mediaRecorder.current = null;
    if (!recorder) {
      stopTracks();
      if (!ok) toast.message("Gravação cancelada");
      return;
    }

    recorder.onstop = () => {
      stopTracks();
      if (!ok || chunks.current.length === 0) {
        toast.message("Gravação cancelada");
        return;
      }
      const blob = new Blob(chunks.current, {
        type: recorder.mimeType || "audio/webm",
      });
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") onRecorded(reader.result);
      };
      reader.readAsDataURL(blob);
    };
    if (recorder.state !== "inactive") recorder.stop();
    else {
      stopTracks();
      if (!ok) toast.message("Gravação cancelada");
    }
  }

  async function onPointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    if (disabled) {
      toast.error("Capture a foto primeiro");
      return;
    }

    const holdMode = isHoldLockPointer(e.pointerType);

    if (!holdMode) {
      // Desktop tap toggle
      if (recording || desktopArmed) {
        finish(true);
        return;
      }
      modeRef.current = "tap";
      const ok = await startRecorder();
      if (!ok) return;
      setRecording(true);
      setDesktopArmed(true);
      setHoldMs(0);
      holdTimer.current = window.setInterval(() => {
        setHoldMs((m) => m + 100);
      }, 100);
      toast.message("Gravando — toque de novo para enviar");
      return;
    }

    // Mobile hold+lock
    modeRef.current = "hold";
    origin.current = { x: e.clientX, y: e.clientY };
    const ok = await startRecorder();
    if (!ok) return;
    setRecording(true);
    setLocked(false);
    setHoldMs(0);
    setHint("none");
    holdTimer.current = window.setInterval(() => {
      setHoldMs((m) => m + 100);
    }, 100);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    if (modeRef.current !== "hold" || !recording || !origin.current || locked) {
      return;
    }
    const dx = e.clientX - origin.current.x;
    const dy = e.clientY - origin.current.y;
    if (shouldLockFromDelta(dy)) {
      setLocked(true);
      setHint("lock");
      toast.message("Gravação travada — toque X para cancelar");
      return;
    }
    setHint(resolveHoldLockHint(dx, dy, false));
  }

  function onPointerUp(e: ReactPointerEvent<HTMLButtonElement>) {
    if (modeRef.current !== "hold" || !recording) return;
    if (locked) return;
    const dx = origin.current ? e.clientX - origin.current.x : 0;
    if (shouldCancelOnRelease(dx, hint)) {
      finish(false);
      return;
    }
    if (holdMs > 200) finish(true);
    else finish(false);
  }

  return (
    <div className="relative flex items-center gap-2">
      {recording ? (
        <span className="absolute -top-10 right-0 whitespace-nowrap rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white">
          {desktopArmed
            ? `Gravando ${Math.floor(holdMs / 1000)}s · toque p/ enviar`
            : locked
              ? "Travado · X cancela"
              : hint === "cancel"
                ? "← Solte para cancelar"
                : hint === "lock"
                  ? "↑ Solte para travar"
                  : `Gravando ${Math.floor(holdMs / 1000)}s · ↑ trava · ← cancela`}
        </span>
      ) : null}
      {locked ? (
        <button
          type="button"
          onClick={() => finish(false)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-foreground shadow ring-1 ring-black/10"
          aria-label="Cancelar gravação"
        >
          <X className="size-5" />
        </button>
      ) : null}
      <button
        type="button"
        disabled={disabled && !recording}
        onPointerDown={(e) => void onPointerDown(e)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          if (modeRef.current === "hold") finish(false);
        }}
        className={cn(
          "flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg transition",
          recording
            ? "scale-105 bg-[var(--brand-pink)]"
            : "bg-[var(--brand-pink)]",
          hint === "cancel" && "opacity-50",
          disabled && !recording && "opacity-40",
        )}
        aria-label="Gravar áudio"
      >
        <Mic className="size-7" />
      </button>
      {locked ? (
        <button
          type="button"
          onClick={() => finish(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-green)] text-white shadow"
          aria-label="Enviar áudio"
        >
          <CheckCircle2 className="size-5" />
        </button>
      ) : null}
    </div>
  );
}

function PreviewPane({
  drafts,
  categories,
  onChange,
  onCategoriesChange,
}: {
  drafts: IntakeDraftItem[];
  categories: CategoryOption[];
  onChange: (clientId: string, patch: Partial<IntakeDraftItem>) => void;
  onCategoriesChange: (next: CategoryOption[]) => void;
}) {
  const brandOptions = useMemo(() => {
    const fromDrafts = drafts
      .map((d) => d.brand?.trim())
      .filter((b): b is string => Boolean(b));
    return Array.from(new Set([...FEATURED_BRANDS, ...fromDrafts])).sort(
      (a, b) => a.localeCompare(b, "pt-BR"),
    );
  }, [drafts]);

  if (drafts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nenhuma peça na série.</p>
    );
  }

  return (
    <section className="pb-4" aria-label="Preview das peças">
      <Carousel
        opts={{ align: "start", containScroll: "trimSnaps" }}
        className="w-full"
      >
        {drafts.length > 1 ? (
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {drafts.length} peças · deslize para revisar
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <CarouselPrevious
                className="static inset-auto size-9 translate-none border-border bg-card shadow-sm"
                aria-label="Peça anterior"
              />
              <CarouselNext
                className="static inset-auto size-9 translate-none border-border bg-card shadow-sm"
                aria-label="Próxima peça"
              />
            </div>
          </div>
        ) : null}
        <CarouselContent className="-ml-3">
          {drafts.map((draft, index) => (
            <CarouselItem
              key={draft.client_id}
              className="pl-3 basis-[min(100%,22rem)] sm:basis-[20rem]"
            >
              <PreviewCard
                index={index}
                draft={draft}
                categories={categories}
                brandOptions={brandOptions}
                onChange={(patch) => onChange(draft.client_id, patch)}
                onCategoriesChange={onCategoriesChange}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  );
}

function genderAccentClass(gender: IntakeDraftItem["gender"]): string {
  if (gender === "menina") return "text-brand-pink";
  if (gender === "menino") return "text-brand-blue";
  return "text-brand-green";
}

function PreviewCard({
  index,
  draft,
  categories,
  brandOptions,
  onChange,
  onCategoriesChange,
}: {
  index: number;
  draft: IntakeDraftItem;
  categories: CategoryOption[];
  brandOptions: string[];
  onChange: (patch: Partial<IntakeDraftItem>) => void;
  onCategoriesChange: (next: CategoryOption[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [creatingBrand, setCreatingBrand] = useState(false);
  const [newBrand, setNewBrand] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [creatingCatPending, setCreatingCatPending] = useState(false);

  const cover = draft.images[0]?.image_url ?? null;
  const priceNum = Number.parseFloat(
    String(draft.price ?? "").replace(",", "."),
  );
  const priceLabel = Number.isFinite(priceNum)
    ? formatPrice(priceNum)
    : "Preço pendente";
  const metaLine = [draft.size_label, draft.brand].filter(Boolean).join(" · ");

  const fieldLocked = !editing;
  const selectTriggerClass = cn(
    "w-full",
    fieldLocked && "disabled:cursor-default disabled:opacity-100",
  );
  const inputClass = cn(
    fieldLocked && "cursor-default bg-muted/40 focus-visible:ring-0",
  );

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

  function commitNewBrand() {
    const trimmed = newBrand.trim();
    if (!trimmed) {
      toast.error("Informe o nome da marca.");
      return;
    }
    onChange({ brand: trimmed });
    setNewBrand("");
    setCreatingBrand(false);
  }

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-2 px-3 pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="text-sm font-semibold">Peça {index + 1}</h3>
          {draft.audio_note ? (
            <span className="truncate text-[11px] text-muted-foreground">
              Com áudio/nota
            </span>
          ) : null}
        </div>
        <Button
          type="button"
          variant={editing ? "default" : "outline"}
          size="sm"
          className="h-8 shrink-0 gap-1.5 px-2.5"
          onClick={() => {
            if (editing) {
              setCreatingBrand(false);
              setCreatingCat(false);
            }
            setEditing((v) => !v);
          }}
          aria-pressed={editing}
        >
          {editing ? (
            <>
              <Check className="size-3.5" />
              Pronto
            </>
          ) : (
            <>
              <Pencil className="size-3.5" />
              Editar
            </>
          )}
        </Button>
      </div>

      <div className="relative mx-3 mt-3 overflow-hidden rounded-xl bg-muted">
        <div className="relative aspect-3/4 w-full">
          {cover ? (
            <Image
              src={cover}
              alt={draft.name || `Peça ${index + 1}`}
              fill
              unoptimized
              className="object-cover"
              sizes="(max-width: 640px) 90vw, 320px"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Sem foto
            </div>
          )}
          <Badge className="absolute top-2 left-2 z-10 h-auto rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground uppercase shadow-sm">
            Única
          </Badge>
        </div>
        <div className="space-y-0.5 px-2.5 py-2.5">
          {metaLine ? (
            <p
              className={cn(
                "truncate text-sm font-semibold tracking-wide",
                genderAccentClass(draft.gender),
              )}
            >
              {metaLine}
            </p>
          ) : null}
          <p className="truncate text-sm font-medium text-foreground/90">
            {draft.name || "Sem nome"}
          </p>
          <p className="text-base font-bold text-primary">{priceLabel}</p>
        </div>
      </div>

      <div className="mt-3 grid flex-1 grid-cols-2 gap-2.5 px-3 pb-3">
        <div className="col-span-2 flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Nome *</Label>
          <Input
            value={draft.name}
            readOnly={fieldLocked}
            tabIndex={fieldLocked ? -1 : undefined}
            className={inputClass}
            onChange={(event) => {
              const name = event.target.value;
              onChange({ name, slug: slugifyProductName(name) });
            }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Preço (R$) *</Label>
          <Input
            inputMode="decimal"
            value={draft.price ?? ""}
            readOnly={fieldLocked}
            tabIndex={fieldLocked ? -1 : undefined}
            className={inputClass}
            onChange={(event) => onChange({ price: event.target.value })}
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Marca</Label>
          <Select
            value={creatingBrand ? "__new__" : (draft.brand ?? "none")}
            disabled={fieldLocked}
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
            <SelectTrigger className={selectTriggerClass} size="sm">
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
          {creatingBrand && editing ? (
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
                onClick={commitNewBrand}
              >
                Usar
              </Button>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Tamanho *</Label>
          <Select
            value={
              isProductSizeLabel(draft.size_label) ? draft.size_label : undefined
            }
            disabled={fieldLocked}
            onValueChange={(value) => {
              if (value && isProductSizeLabel(value)) {
                onChange({ size_label: value });
              }
            }}
          >
            <SelectTrigger className={selectTriggerClass} size="sm">
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
          <Label className="text-xs text-muted-foreground">Grupo</Label>
          <Select
            value={draft.size_group}
            disabled={fieldLocked}
            onValueChange={(value) =>
              onChange({
                size_group: value as IntakeDraftItem["size_group"],
              })
            }
          >
            <SelectTrigger className={selectTriggerClass} size="sm">
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
            disabled={fieldLocked}
            onValueChange={(value) =>
              onChange({ gender: value as IntakeDraftItem["gender"] })
            }
          >
            <SelectTrigger className={selectTriggerClass} size="sm">
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
            disabled={fieldLocked}
            onValueChange={(value) =>
              onChange({
                condition: value as IntakeDraftItem["condition"],
              })
            }
          >
            <SelectTrigger className={selectTriggerClass} size="sm">
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
            disabled={fieldLocked}
            onValueChange={(value) => {
              if (value === "__new__") {
                setCreatingCat(true);
                return;
              }
              setCreatingCat(false);
              onChange({ category_id: value === "none" ? null : value });
            }}
          >
            <SelectTrigger className={selectTriggerClass} size="sm">
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
          {creatingCat && editing ? (
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
            readOnly={fieldLocked}
            tabIndex={fieldLocked ? -1 : undefined}
            className={cn("min-h-16 resize-none", inputClass)}
            rows={3}
            onChange={(event) =>
              onChange({ description: event.target.value || null })
            }
          />
        </div>

        <div className="col-span-2 flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Tags (vírgula)</Label>
          <Input
            value={(draft.tags ?? []).join(", ")}
            readOnly={fieldLocked}
            tabIndex={fieldLocked ? -1 : undefined}
            className={inputClass}
            onChange={(event) =>
              onChange({
                tags: event.target.value
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>
      </div>
    </article>
  );
}
