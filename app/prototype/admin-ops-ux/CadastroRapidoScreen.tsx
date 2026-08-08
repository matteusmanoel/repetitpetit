"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  Expand,
  Mic,
  MicOff,
  Sparkles,
  X,
} from "lucide-react";
import { protoToast } from "./proto-toast";

import { usePrototypeState } from "./prototype-state";

function isDraftComplete(c: {
  photoDataUrl: string | null;
  name: string;
  priceLabel: string;
  categoryId: string | null;
}): boolean {
  return Boolean(
    c.photoDataUrl &&
      c.name.trim() &&
      c.priceLabel.trim() &&
      c.categoryId,
  );
}

export function CadastroRapidoScreen() {
  const {
    captureSeries,
    selectedCaptureId,
    setSelectedCaptureId,
    cadastroTab,
    setCadastroTab,
    addCapture,
    setCaptureAudio,
    updateCapture,
    resetSeries,
    categories,
  } = usePrototypeState();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [previewQuery, setPreviewQuery] = useState("");
  const [previewChip, setPreviewChip] = useState<
    "all" | "com_audio" | "sem_audio"
  >("all");
  const [page, setPage] = useState(0);
  const pageSize = 6;

  // Audio gesture state
  const [recording, setRecording] = useState(false);
  const [locked, setLocked] = useState(false);
  const [holdMs, setHoldMs] = useState(0);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const holdTimer = useRef<number | null>(null);
  const [hint, setHint] = useState<"none" | "lock" | "cancel">("none");

  const selected =
    captureSeries.find((c) => c.id === selectedCaptureId) ??
    captureSeries[captureSeries.length - 1] ??
    null;

  const allComplete =
    captureSeries.length > 0 && captureSeries.every(isDraftComplete);

  // Auto-advance when current slot has photo + audio
  useEffect(() => {
    if (!selected?.photoDataUrl || !selected.hasAudio) return;
    if (selected.aiStatus === "running") return;
    const t = window.setTimeout(() => {
      protoToast.success("Peça pronta — próxima captura");
      // Deselect so next snap creates fresh slot focus
      setSelectedCaptureId(null);
    }, 450);
    return () => window.clearTimeout(t);
  }, [
    selected?.id,
    selected?.photoDataUrl,
    selected?.hasAudio,
    selected?.aiStatus,
    setSelectedCaptureId,
  ]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (!cameraOn || cadastroTab !== "captura") return;
    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        setCameraOn(false);
        protoToast.error("Câmera indisponível — use foto mock");
      }
    })();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [cameraOn, cadastroTab]);

  function snap() {
    const video = videoRef.current;
    let dataUrl = mockPhoto();
    if (video && video.videoWidth) {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        dataUrl = canvas.toDataURL("image/jpeg", 0.75);
      }
    }
    // If current selected has no photo yet, fill it; else new slot
    if (selected && !selected.photoDataUrl) {
      updateCapture(selected.id, { photoDataUrl: dataUrl, aiStatus: "running" });
      window.setTimeout(() => {
        updateCapture(selected.id, {
          aiStatus: "done",
          name: selected.name || `Peça`,
          priceLabel: selected.priceLabel || "R$ 29,90",
          categoryId: selected.categoryId ?? categories[0]?.id ?? null,
        });
      }, 600);
    } else {
      addCapture(dataUrl);
    }
    protoToast.message("Foto capturada — grave o áudio");
  }

  function finishAudio(ok: boolean) {
    if (holdTimer.current) window.clearInterval(holdTimer.current);
    setRecording(false);
    setLocked(false);
    setHoldMs(0);
    setHint("none");
    origin.current = null;
    if (ok && selected) {
      setCaptureAudio(selected.id, true);
      protoToast.success("Áudio vinculado à foto");
    } else if (!ok) {
      protoToast.message("Gravação cancelada");
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!selected?.photoDataUrl) {
      protoToast.error("Capture a foto primeiro");
      return;
    }
    if (selected.hasAudio) {
      protoToast.message("Regravando áudio deste slot");
    }
    origin.current = { x: e.clientX, y: e.clientY };
    setRecording(true);
    setLocked(false);
    setHoldMs(0);
    holdTimer.current = window.setInterval(() => {
      setHoldMs((m) => m + 100);
    }, 100);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!recording || !origin.current || locked) return;
    const dx = e.clientX - origin.current.x;
    const dy = e.clientY - origin.current.y;
    if (dy < -56) {
      setLocked(true);
      setHint("lock");
      protoToast.message("Gravação travada — toque X para cancelar");
      return;
    }
    if (dx < -56) {
      setHint("cancel");
    } else {
      setHint(dy < -24 ? "lock" : "none");
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!recording) return;
    if (locked) return; // wait for X or explicit stop
    const dx = origin.current ? e.clientX - origin.current.x : 0;
    if (dx < -56 || hint === "cancel") {
      finishAudio(false);
      return;
    }
    if (holdMs > 200) {
      finishAudio(true);
    } else {
      finishAudio(false);
    }
  }

  const filtered = captureSeries.filter((c) => {
    if (previewChip === "com_audio" && !c.hasAudio) return false;
    if (previewChip === "sem_audio" && c.hasAudio) return false;
    if (
      previewQuery &&
      !c.name.toLowerCase().includes(previewQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize) || 1);
  const pageItems = filtered.slice(page * pageSize, page * pageSize + pageSize);

  return (
    <div className="relative mx-auto flex h-[calc(100dvh-8.5rem)] max-w-5xl flex-col space-y-4 overflow-hidden pb-4 md:h-[calc(100dvh-5.5rem)]">
      <header className="flex shrink-0 items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Cadastro em massa
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Série de fotos + áudio → próximo automático
          </p>
        </div>
        <button
          type="button"
          disabled={!allComplete}
          onClick={() => setConfirmOpen(true)}
          className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-2xl border border-[var(--brand-green)]/40 bg-white px-3 text-sm font-semibold text-[var(--brand-green)] shadow-sm disabled:cursor-not-allowed disabled:opacity-35"
        >
          <CheckCircle2 className="size-5" />
          Finalizar
        </button>
      </header>

      <div className="flex w-fit shrink-0 gap-0 rounded-2xl bg-black/5 p-1">
        {(
          [
            { id: "captura" as const, label: "Captura" },
            {
              id: "preview" as const,
              label: `Preview (${captureSeries.length})`,
            },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setCadastroTab(t.id)}
            className={`inline-flex h-11 cursor-pointer items-center rounded-xl px-4 text-sm font-medium transition ${
              cadastroTab === t.id
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {cadastroTab === "captura" ? (
        <div className="flex min-h-0 flex-1 flex-col space-y-4 overflow-hidden">
          {/* Reserved strip — always present to avoid layout jump */}
          <div className="h-[4.5rem] shrink-0">
            <ul className="flex h-full gap-2 overflow-x-auto rounded-2xl border border-dashed border-black/10 bg-white/60 px-2 py-2">
              {captureSeries.length === 0 ? (
                <li className="flex h-full flex-1 items-center justify-center text-xs text-muted-foreground">
                  Série vazia — as miniaturas aparecem aqui
                </li>
              ) : (
                captureSeries.map((c, idx) => {
                  const active = c.id === selected?.id;
                  return (
                    <li key={c.id} className="shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedCaptureId(c.id)}
                        className={`relative h-full w-14 overflow-hidden rounded-xl ring-2 ${
                          active
                            ? "ring-[var(--brand-green)]"
                            : "ring-transparent"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={c.photoDataUrl ?? ""}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                        <span className="absolute left-1 top-1 rounded bg-black/50 px-1 text-[9px] text-white">
                          {idx + 1}
                        </span>
                        <span
                          className={`absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full ${
                            c.hasAudio
                              ? "bg-[var(--brand-green)] text-white"
                              : "bg-black/55 text-white"
                          }`}
                        >
                          {c.hasAudio ? (
                            <Mic className="size-3" />
                          ) : (
                            <MicOff className="size-3" />
                          )}
                        </span>
                        {c.aiStatus === "running" ? (
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
              <div className="flex h-full flex-col items-center justify-center gap-4 text-white">
                <Camera className="size-12 opacity-80" />
                <button
                  type="button"
                  className="h-12 cursor-pointer rounded-2xl bg-white px-6 text-sm font-semibold text-foreground"
                  onClick={() => setCameraOn(true)}
                >
                  Abrir câmera
                </button>
                <button
                  type="button"
                  className="cursor-pointer text-sm underline opacity-80"
                  onClick={() => {
                    addCapture(mockPhoto());
                    protoToast.message("Foto mock — grave o áudio");
                  }}
                >
                  Usar foto mock
                </button>
              </div>
            )}
            {cameraOn ? (
              <button
                type="button"
                onClick={() => snap()}
                className="absolute bottom-5 left-1/2 h-[4.25rem] w-[4.25rem] -translate-x-1/2 cursor-pointer rounded-full border-[5px] border-white bg-white/25"
                aria-label="Capturar foto"
              />
            ) : null}

            {recording ? (
              <div className="absolute inset-x-0 top-4 flex justify-center">
                <span className="rounded-full bg-black/60 px-4 py-2 text-sm font-semibold text-white">
                  {locked
                    ? "Travado · X cancela"
                    : hint === "cancel"
                      ? "← Solte para cancelar"
                      : hint === "lock"
                        ? "↑ Solte para travar"
                        : `Gravando ${Math.floor(holdMs / 1000)}s · ↑ trava · ← cancela`}
                </span>
              </div>
            ) : null}
          </div>

          <p className="h-5 shrink-0 text-center text-sm text-muted-foreground">
            {selected ? (
              <>
                Slot:{" "}
                <strong className="text-foreground">
                  {selected.name ||
                    `#${captureSeries.findIndex((c) => c.id === selected.id) + 1}`}
                </strong>
                {selected.hasAudio ? " · áudio ✓" : " · aguardando áudio"}
              </>
            ) : (
              "Capture a foto; em seguida segure o microfone"
            )}
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto pb-4">
        <PreviewPane
          previewQuery={previewQuery}
          setPreviewQuery={setPreviewQuery}
          previewChip={previewChip}
          setPreviewChip={setPreviewChip}
          page={page}
          setPage={setPage}
          pageCount={pageCount}
          pageItems={pageItems}
          filteredLen={filtered.length}
          total={captureSeries.length}
          onExpand={setExpandedId}
        />
        </div>
      )}

      {/* Fixed big mic — captura tab only */}
      {cadastroTab === "captura" ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-[4.5rem] z-30 flex justify-center md:bottom-8">
          <div className="pointer-events-auto relative flex items-center gap-3">
            {locked ? (
              <button
                type="button"
                onClick={() => finishAudio(false)}
                className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-white text-foreground shadow-lg ring-1 ring-black/10"
                aria-label="Cancelar gravação"
              >
                <X className="size-6" />
              </button>
            ) : null}
            <button
              type="button"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={() => finishAudio(false)}
              className={`flex h-20 w-20 cursor-pointer items-center justify-center rounded-full text-white shadow-xl transition ${
                recording
                  ? "scale-110 bg-[var(--brand-pink)]"
                  : "bg-[var(--brand-pink)]"
              } ${hint === "cancel" ? "opacity-50" : ""}`}
              aria-label="Segurar para gravar áudio"
            >
              <Mic className="size-9" />
            </button>
            {locked ? (
              <button
                type="button"
                onClick={() => finishAudio(true)}
                className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-[var(--brand-green)] text-white shadow-lg"
                aria-label="Enviar áudio"
              >
                <CheckCircle2 className="size-6" />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {expandedId ? (
        <ExpandCaptureDialog
          id={expandedId}
          onClose={() => setExpandedId(null)}
        />
      ) : null}

      {confirmOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-semibold">Confirmar cadastro em lote?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {captureSeries.length} peça(s) serão criadas.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                className="h-12 flex-1 cursor-pointer rounded-2xl border border-border text-sm font-semibold"
                onClick={() => setConfirmOpen(false)}
              >
                Voltar
              </button>
              <button
                type="button"
                className="h-12 flex-1 cursor-pointer rounded-2xl bg-[var(--brand-green)] text-sm font-bold text-white"
                onClick={() => {
                  setConfirmOpen(false);
                  resetSeries();
                  protoToast.success("Lote enviado (mock)");
                }}
              >
                Confirmar insert
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PreviewPane({
  previewQuery,
  setPreviewQuery,
  previewChip,
  setPreviewChip,
  page,
  setPage,
  pageCount,
  pageItems,
  filteredLen,
  total,
  onExpand,
}: {
  previewQuery: string;
  setPreviewQuery: (v: string) => void;
  previewChip: "all" | "com_audio" | "sem_audio";
  setPreviewChip: (v: "all" | "com_audio" | "sem_audio") => void;
  page: number;
  setPage: (n: number | ((p: number) => number)) => void;
  pageCount: number;
  pageItems: {
    id: string;
    photoDataUrl: string | null;
    name: string;
    priceLabel: string;
    hasAudio: boolean;
  }[];
  filteredLen: number;
  total: number;
  onExpand: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={previewQuery}
          onChange={(e) => {
            setPreviewQuery(e.target.value);
            setPage(0);
          }}
          placeholder="Buscar na série…"
          className="h-14 w-full rounded-2xl border border-black/10 bg-white px-4 text-base shadow-sm sm:flex-1"
        />
        <div className="flex gap-2">
          {(
            [
              { id: "all" as const, label: "Todos" },
              { id: "com_audio" as const, label: "Com áudio" },
              { id: "sem_audio" as const, label: "Sem áudio" },
            ] as const
          ).map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => {
                setPreviewChip(chip.id);
                setPage(0);
              }}
              className={`h-11 cursor-pointer rounded-2xl px-3 text-sm font-medium ${
                previewChip === chip.id
                  ? "bg-foreground text-background"
                  : "bg-white text-muted-foreground shadow-sm ring-1 ring-black/5"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        {filteredLen} de {total} na série
      </p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {pageItems.map((c) => (
          <li key={c.id}>
            <article className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
              <div className="relative aspect-[3/4] bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.photoDataUrl ?? ""}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <span
                  className={`absolute left-2 top-2 rounded-full px-2 py-1 text-[11px] font-bold ${
                    c.hasAudio
                      ? "bg-[var(--brand-green)] text-white"
                      : "bg-amber-100 text-amber-900"
                  }`}
                >
                  {c.hasAudio ? "Áudio" : "Sem áudio"}
                </span>
                <button
                  type="button"
                  onClick={() => onExpand(c.id)}
                  className="absolute bottom-2 right-2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/95 shadow"
                >
                  <Expand className="size-4" />
                </button>
              </div>
              <div className="space-y-1 p-3">
                <p className="line-clamp-2 text-sm font-medium">
                  {c.name || "Sem nome"}
                </p>
                <p className="text-lg font-bold text-[var(--brand-green)]">
                  {c.priceLabel || "—"}
                </p>
              </div>
            </article>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={page <= 0}
          onClick={() => setPage((p) => p - 1)}
          className="h-11 cursor-pointer rounded-2xl bg-white px-4 text-sm font-medium shadow-sm ring-1 ring-black/5 disabled:opacity-40"
        >
          Anterior
        </button>
        <p className="text-sm text-muted-foreground">
          Página {page + 1} / {pageCount} · total {total}
        </p>
        <button
          type="button"
          disabled={page >= pageCount - 1}
          onClick={() => setPage((p) => p + 1)}
          className="h-11 cursor-pointer rounded-2xl bg-white px-4 text-sm font-medium shadow-sm ring-1 ring-black/5 disabled:opacity-40"
        >
          Próxima
        </button>
      </div>
    </div>
  );
}

function ExpandCaptureDialog({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const { captureSeries, updateCapture, categories, addCategory } =
    usePrototypeState();
  const c = captureSeries.find((x) => x.id === id);
  if (!c) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-6">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid gap-5 sm:grid-cols-[11rem_1fr]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={c.photoDataUrl ?? ""}
              alt=""
              className="aspect-[3/4] w-full rounded-2xl object-cover sm:max-h-56"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 sm:col-span-2">
                <span className="text-sm font-medium">Nome *</span>
                <input
                  className="h-11 w-full rounded-2xl border border-black/10 px-3 text-sm"
                  value={c.name}
                  onChange={(e) => updateCapture(c.id, { name: e.target.value })}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium">Preço *</span>
                <input
                  className="h-11 w-full rounded-2xl border border-black/10 px-3 text-sm"
                  value={c.priceLabel}
                  onChange={(e) =>
                    updateCapture(c.id, { priceLabel: e.target.value })
                  }
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium">Categoria *</span>
                <select
                  className="h-11 w-full rounded-2xl border border-black/10 px-3 text-sm"
                  value={c.categoryId ?? ""}
                  onChange={(e) => {
                    if (e.target.value === "__new__") {
                      const name = window.prompt("Nome da categoria");
                      if (name) {
                        const created = addCategory(name);
                        updateCapture(c.id, { categoryId: created.id });
                      }
                      return;
                    }
                    updateCapture(c.id, {
                      categoryId: e.target.value || null,
                    });
                  }}
                >
                  <option value="">—</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                  <option value="__new__">+ Criar…</option>
                </select>
              </label>
              <p className="text-sm text-muted-foreground sm:col-span-2">
                Áudio: {c.hasAudio ? "gravado" : "pendente"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2 border-t border-border p-4">
          <button
            type="button"
            className="h-12 flex-1 cursor-pointer rounded-2xl border border-border text-sm font-semibold"
            onClick={onClose}
          >
            Fechar
          </button>
          <button
            type="button"
            className="h-12 flex-1 cursor-pointer rounded-2xl bg-[var(--brand-green)] text-sm font-bold text-white"
            onClick={() => {
              protoToast.success("Peça atualizada");
              onClose();
            }}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

function mockPhoto() {
  const n = Math.floor(Math.random() * 90) + 10;
  return (
    "data:image/svg+xml," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="520">
        <rect fill="#cfe0a8" width="100%" height="100%"/>
        <text x="50%" y="50%" text-anchor="middle" fill="#3d5a1a" font-family="system-ui,sans-serif" font-size="22">Foto ${n}</text>
      </svg>`,
    )
  );
}
