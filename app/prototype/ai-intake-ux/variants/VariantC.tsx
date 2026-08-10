"use client";

/**
 * PROTOTYPE Variant C — WINNER (C shell/modes + B editable preview)
 * Sessão fullscreen: camera → record → confirm → preview edit → próxima.
 * Header/bottom bar só no lobby. Cancelar/Finalizar com confirm dialog.
 */

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Camera,
  Check,
  Mic,
  Pencil,
  Sparkles,
  Square,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

import {
  applyFakeAi,
  stubPhotoDataUrl,
  usePrototypeState,
  type PieceDraft,
} from "../prototype-state";
import { ConfirmDialog, ProtoAdminShell, StateDebug } from "../shared";

export const VARIANT_C_META = {
  key: "C",
  label: "Vencedor (C+edit B)",
} as const;

type Mode =
  | "lobby"
  | "camera"
  | "record"
  | "confirm"
  | "working"
  | "preview";

export function VariantC() {
  const {
    current,
    setCurrent,
    approveCurrent,
    resetCurrent,
    piecesDone,
    batchQueue,
  } = usePrototypeState();

  const [mode, setMode] = useState<Mode>("lobby");
  const [recording, setRecording] = useState(false);
  const [recMs, setRecMs] = useState(0);
  const [draft, setDraft] = useState<PieceDraft | null>(null);
  const [exitConfirm, setExitConfirm] = useState<"cancel" | "finish" | null>(
    null,
  );
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!recording) return;
    timer.current = window.setInterval(() => setRecMs((m) => m + 100), 100);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [recording]);

  function startSession() {
    resetCurrent();
    setDraft(null);
    setRecMs(0);
    setMode("camera");
  }

  function snap() {
    setCurrent({
      photoDataUrl: stubPhotoDataUrl(`Peça ${piecesDone + 1}`),
      status: "ready",
    });
    setMode("record");
  }

  function startRec() {
    setRecording(true);
    setRecMs(0);
    setCurrent({ status: "recording" });
  }

  function stopRec() {
    setRecording(false);
    setCurrent({ hasAudio: true, audioMs: recMs, status: "ready" });
    setMode("confirm");
  }

  function confirmSend() {
    setMode("working");
    window.setTimeout(() => {
      const filled = applyFakeAi({
        ...current,
        hasAudio: true,
        audioMs: recMs,
      });
      setDraft(filled);
      setCurrent(filled);
      setMode("preview");
    }, 900);
  }

  function nextPiece() {
    approveCurrent();
    setDraft(null);
    setRecMs(0);
    setRecording(false);
    setMode("camera");
  }

  // —— Lobby (standard shell) ——
  if (mode === "lobby") {
    return (
      <ProtoAdminShell>
        <StateDebug
          payload={{
            variant: "C",
            mode,
            piecesDone,
            sessionPieces: batchQueue.length,
          }}
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
          <div className="rounded-full bg-[var(--brand-green)]/15 p-5">
            <Camera className="size-10 text-[var(--brand-green)]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Sessão de cadastro</h2>
            <p className="max-w-xs text-sm text-muted-foreground">
              Interface fullscreen tipo app nativo. Header e bottom bar somem
              até você finalizar ou cancelar a sessão.
            </p>
          </div>
          <button
            type="button"
            className="flex h-12 w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-[var(--brand-green)] text-sm font-semibold text-white"
            onClick={startSession}
          >
            Iniciar sessão
            <ArrowRight className="size-4" />
          </button>
          {batchQueue.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Última sessão: {batchQueue.length} peça(s) aprovada(s)
            </p>
          ) : null}
        </div>
      </ProtoAdminShell>
    );
  }

  // —— Session chrome (fullscreen modes) ——
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-zinc-950 text-white">
      <StateDebug
        payload={{
          variant: "C",
          mode,
          recording,
          recMs,
          hasPhoto: Boolean(current.photoDataUrl),
          piecesDone,
        }}
      />

      <header className="flex items-center justify-between px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          className="inline-flex h-10 items-center gap-1 rounded-xl px-2 text-sm text-white/80"
          onClick={() => setExitConfirm("cancel")}
        >
          <X className="size-4" />
          Cancelar
        </button>
        <ModeDots mode={mode} />
        <button
          type="button"
          className="inline-flex h-10 items-center gap-1 rounded-xl px-2 text-sm text-[var(--brand-green)]"
          onClick={() => setExitConfirm("finish")}
        >
          <Check className="size-4" />
          Finalizar
        </button>
      </header>

      {mode === "camera" ? (
        <div className="relative flex flex-1 flex-col">
          <div className="relative flex-1 bg-zinc-800">
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/50">
              <Camera className="size-16" />
              <p className="text-sm">Aponte para a peça</p>
            </div>
            <div className="pointer-events-none absolute inset-8 rounded-[2.5rem] border border-white/35" />
          </div>
          <div className="flex flex-col items-center gap-3 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
            <p className="text-xs text-white/60">Passo 1 de 3 · Foto</p>
            <button
              type="button"
              className="h-[4.75rem] w-[4.75rem] rounded-full border-[6px] border-white bg-white/20"
              onClick={snap}
              aria-label="Capturar"
            />
          </div>
        </div>
      ) : null}

      {mode === "record" || mode === "confirm" ? (
        <div className="relative flex flex-1 flex-col">
          <div className="relative flex-1">
            {current.photoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={current.photoDataUrl}
                alt=""
                className={cn(
                  "h-full w-full object-cover",
                  recording && "opacity-60",
                )}
              />
            ) : null}
            {recording ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-red-700/75">
                <div className="flex h-20 items-end gap-1">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <span
                      key={i}
                      className="w-1.5 animate-pulse rounded-full bg-white"
                      style={{
                        height: `${12 + ((i * 17) % 40)}px`,
                        animationDelay: `${i * 40}ms`,
                      }}
                    />
                  ))}
                </div>
                <p className="text-lg font-bold tracking-wide">
                  Gravando… {Math.floor(recMs / 1000)}s
                </p>
                <p className="max-w-[16rem] text-center text-xs text-white/85">
                  Categoria → marca → cor → tamanho → condição → preço
                </p>
              </div>
            ) : null}
            {mode === "confirm" && !recording ? (
              <div className="absolute inset-0 flex flex-col items-center justify-end bg-gradient-to-t from-black/80 via-black/30 to-transparent p-6 pb-8">
                <p className="mb-1 text-sm font-semibold">Áudio pronto</p>
                <p className="mb-4 text-xs text-white/70">
                  {Math.max(1, Math.floor(recMs / 1000))}s · confirme para
                  processar
                </p>
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-center gap-4 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
            {mode === "record" && !recording ? (
              <>
                <p className="absolute bottom-24 text-xs text-white/60">
                  Passo 2 de 3 · Áudio
                </p>
                <button
                  type="button"
                  onClick={startRec}
                  className="flex h-16 w-16 flex-col items-center justify-center rounded-full bg-red-600 shadow-xl"
                >
                  <Mic className="size-6" />
                  <span className="text-[9px] font-bold">Gravar</span>
                </button>
              </>
            ) : null}
            {recording ? (
              <button
                type="button"
                onClick={stopRec}
                className="flex h-16 min-w-16 flex-col items-center justify-center rounded-full bg-white text-zinc-900 shadow-xl"
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
                    setCurrent({ hasAudio: false, audioMs: 0 });
                    setRecMs(0);
                    setMode("record");
                  }}
                >
                  Regravar
                </button>
                <button
                  type="button"
                  className="h-12 flex-[1.4] rounded-2xl bg-[var(--brand-green)] text-sm font-semibold text-white"
                  onClick={confirmSend}
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
          <p className="text-xs text-white/50">stub · sem chamada real</p>
        </div>
      ) : null}

      {mode === "preview" && draft ? (
        <div className="flex flex-1 flex-col overflow-hidden bg-zinc-100 text-foreground">
          <div className="flex-1 overflow-y-auto p-4 pb-28">
            <div className="mx-auto flex max-w-lg flex-col gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={draft.photoDataUrl ?? ""}
                alt=""
                className="aspect-[4/3] w-full rounded-3xl object-cover"
              />
              <p className="text-xs font-medium text-muted-foreground">
                Passo 3 de 3 · Revisar e editar
              </p>
              <Field
                label="Nome"
                value={draft.name}
                onChange={(v) => setDraft({ ...draft, name: v })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Categoria"
                  value={draft.category}
                  onChange={(v) => setDraft({ ...draft, category: v })}
                />
                <Field
                  label="Tamanho"
                  value={draft.size}
                  onChange={(v) => setDraft({ ...draft, size: v })}
                />
                <Field
                  label="Cor"
                  value={draft.color}
                  onChange={(v) => setDraft({ ...draft, color: v })}
                />
                <Field
                  label="Preço"
                  value={draft.price}
                  onChange={(v) => setDraft({ ...draft, price: v })}
                />
              </div>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Pencil className="size-3.5" />
                Edite antes de aprovar. Aprovar abre a próxima peça.
              </p>
            </div>
          </div>
          <div className="border-t border-black/5 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--brand-green)] text-sm font-semibold text-white"
              onClick={nextPiece}
            >
              <Check className="size-4" />
              Aprovar · próxima peça
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={exitConfirm === "cancel"}
        title="Cancelar sessão?"
        body="Descarta a peça em andamento e volta ao shell com header/bottom bar."
        confirmLabel="Cancelar sessão"
        destructive
        onCancel={() => setExitConfirm(null)}
        onConfirm={() => {
          setExitConfirm(null);
          setRecording(false);
          resetCurrent();
          setDraft(null);
          setMode("lobby");
        }}
      />
      <ConfirmDialog
        open={exitConfirm === "finish"}
        title="Finalizar sessão?"
        body={`${batchQueue.length} peça(s) já aprovadas nesta sessão. Voltar ao admin padrão.`}
        confirmLabel="Finalizar"
        onCancel={() => setExitConfirm(null)}
        onConfirm={() => {
          setExitConfirm(null);
          setRecording(false);
          resetCurrent();
          setDraft(null);
          setMode("lobby");
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
        : mode === "working" || mode === "preview"
          ? 2
          : 0;
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

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <input
        className="h-11 w-full rounded-xl border border-border bg-white px-3"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
