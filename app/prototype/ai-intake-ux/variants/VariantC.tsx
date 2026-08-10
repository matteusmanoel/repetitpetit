"use client";

/**
 * PROTOTYPE — Recording checklist layouts (rev.2)
 * Question: how should the memory checklist stay visible during Gravando?
 *
 * A — Dock: checklist sheet above sticky mic (photo behind; never swapped away)
 * B — Split: foto no topo + checklist fixo no miolo
 * C — Checklist-first: foto vira thumbnail; checklist é a superfície principal
 *
 * Common rule: checklist NÃO some ao gravar; sem textos extras; só campos+exemplos.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
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
import {
  SCRIPT_ITEMS,
  VoiceChecklist,
  type ScriptChecked,
} from "../voice-checklist";

export const VARIANT_A_META = {
  key: "A",
  label: "Dock + pulse (alvo)",
} as const;
export const VARIANT_B_META = {
  key: "B",
  label: "Split foto/lista",
} as const;
export const VARIANT_C_META = {
  key: "C",
  label: "Checklist-first",
} as const;

type Mode =
  | "lobby"
  | "camera"
  | "record"
  | "confirm"
  | "working"
  | "preview";

type Layout = "dock" | "split" | "first";

function useSession(layout: Layout) {
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
  const [checked, setChecked] = useState<ScriptChecked>({});
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!recording) return;
    timer.current = window.setInterval(() => setRecMs((m) => m + 100), 100);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [recording]);

  function toggleItem(id: string) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function startSession() {
    resetCurrent();
    setDraft(null);
    setRecMs(0);
    setChecked({});
    setMode("camera");
  }

  function snap() {
    setCurrent({
      photoDataUrl: stubPhotoDataUrl(`Peça ${piecesDone + 1}`),
      status: "ready",
    });
    setChecked({});
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
    }, 700);
  }

  function nextPiece() {
    approveCurrent();
    setDraft(null);
    setRecMs(0);
    setRecording(false);
    setChecked({});
    setMode("camera");
  }

  function exitToLobby() {
    setRecording(false);
    resetCurrent();
    setDraft(null);
    setChecked({});
    setMode("lobby");
  }

  return {
    layout,
    current,
    setCurrent,
    batchQueue,
    piecesDone,
    mode,
    setMode,
    recording,
    recMs,
    draft,
    setDraft,
    checked,
    toggleItem,
    startSession,
    snap,
    startRec,
    stopRec,
    confirmSend,
    nextPiece,
    exitToLobby,
  };
}

function Lobby({
  layout,
  onStart,
  batchCount,
}: {
  layout: Layout;
  onStart: () => void;
  batchCount: number;
}) {
  return (
    <ProtoAdminShell>
      <StateDebug payload={{ layout, mode: "lobby", batchCount }} />
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="rounded-full bg-[var(--brand-green)]/15 p-5">
          <Camera className="size-10 text-[var(--brand-green)]" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Sessão · checklist áudio</h2>
          <p className="max-w-xs text-sm text-muted-foreground">
            Layout <strong>{layout}</strong>: checklist permanece visível
            durante Gravando (memória). Sem textos extras nos itens.
          </p>
        </div>
        <button
          type="button"
          className="flex h-12 w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-[var(--brand-green)] text-sm font-semibold text-white"
          onClick={onStart}
        >
          Iniciar sessão
          <ArrowRight className="size-4" />
        </button>
      </div>
    </ProtoAdminShell>
  );
}

function SessionChrome({
  children,
  mode,
  recording,
  recMs,
  checked,
  piecesDone,
  layout,
  onCancel,
  onFinish,
}: {
  children: ReactNode;
  mode: Mode;
  recording: boolean;
  recMs: number;
  checked: ScriptChecked;
  piecesDone: number;
  layout: Layout;
  onCancel: () => void;
  onFinish: () => void;
}) {
  const marked = SCRIPT_ITEMS.filter((i) => checked[i.id]).length;
  return (
    <div className="fixed inset-0 z-[60] flex flex-col overscroll-none bg-zinc-950 text-white">
      <StateDebug
        payload={{
          layout,
          mode,
          recording,
          recMs,
          checklist: `${marked}/${SCRIPT_ITEMS.length}`,
          piecesDone,
        }}
      />
      <header className="flex shrink-0 items-center justify-between px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          className="inline-flex h-10 items-center gap-1 rounded-xl px-2 text-sm text-white/80"
          onClick={onCancel}
        >
          <X className="size-4" />
          Cancelar
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
        <button
          type="button"
          className="inline-flex h-10 items-center gap-1 rounded-xl px-2 text-sm text-[var(--brand-green)]"
          onClick={onFinish}
        >
          <Check className="size-4" />
          Finalizar
        </button>
      </header>
      {children}
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
    <div className="flex items-center gap-1.5">
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

function CameraStep({ onSnap }: { onSnap: () => void }) {
  return (
    <div className="relative flex flex-1 flex-col">
      <div className="relative flex-1 bg-zinc-800">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/50">
          <Camera className="size-16" />
          <p className="text-sm">Aponte para a peça</p>
        </div>
        <div className="pointer-events-none absolute inset-8 rounded-[2.5rem] border border-white/35" />
      </div>
      <div className="flex flex-col items-center gap-3 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
        <p className="text-xs text-white/60">Passo 1 · Foto</p>
        <button
          type="button"
          className="h-[4.75rem] w-[4.75rem] rounded-full border-[6px] border-white bg-white/20"
          onClick={onSnap}
          aria-label="Capturar"
        />
      </div>
    </div>
  );
}

function MicBar({
  recording,
  onStart,
  onStop,
}: {
  recording: boolean;
  onStart: () => void;
  onStop: () => void;
}) {
  return (
    <button
      type="button"
      onClick={recording ? onStop : onStart}
      className={cn(
        "flex h-[4.25rem] w-[4.25rem] flex-col items-center justify-center rounded-full shadow-xl active:scale-95",
        recording ? "bg-white text-zinc-900" : "bg-red-600 text-white",
      )}
      aria-label={recording ? "Parar" : "Gravar"}
      aria-pressed={recording}
    >
      {recording ? (
        <Square className="size-6 fill-current" />
      ) : (
        <Mic className="size-7" />
      )}
      <span className="text-[11px] font-bold">
        {recording ? "Parar" : "Gravar"}
      </span>
    </button>
  );
}

function PreviewStep({
  draft,
  setDraft,
  onNext,
}: {
  draft: PieceDraft;
  setDraft: (d: PieceDraft) => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-zinc-100 text-foreground">
      <div className="flex-1 overflow-y-auto p-4 pb-28">
        <div className="mx-auto flex max-w-lg flex-col gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={draft.photoDataUrl ?? ""}
            alt=""
            className="aspect-[4/3] w-full rounded-3xl object-cover"
          />
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">Nome</span>
            <input
              className="h-11 w-full rounded-xl border border-border bg-white px-3"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["category", "Categoria"],
                ["size", "Tamanho"],
                ["color", "Cor"],
                ["price", "Preço"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block text-sm">
                <span className="mb-1 block text-xs text-muted-foreground">
                  {label}
                </span>
                <input
                  className="h-11 w-full rounded-xl border border-border bg-white px-3"
                  value={draft[key]}
                  onChange={(e) =>
                    setDraft({ ...draft, [key]: e.target.value })
                  }
                />
              </label>
            ))}
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Pencil className="size-3.5" />
            Preview editável (B)
          </p>
        </div>
      </div>
      <div className="border-t border-black/5 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--brand-green)] text-sm font-semibold text-white"
          onClick={onNext}
        >
          <Check className="size-4" />
          Aprovar · próxima peça
        </button>
      </div>
    </div>
  );
}

/** A — Dock: checklist always above mic; recording only tints + badge */
function RecordDock(props: ReturnType<typeof useSession>) {
  const {
    current,
    recording,
    checked,
    toggleItem,
    startRec,
    stopRec,
    mode,
    setMode,
    setCurrent,
    recMs,
    confirmSend,
  } = props;

  if (mode === "confirm") {
    return (
      <div className="relative flex flex-1 flex-col">
        <div className="relative min-h-0 flex-1">
          {current.photoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={current.photoDataUrl}
              alt=""
              className="h-full w-full object-cover opacity-50"
            />
          ) : null}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-6 pb-8 text-center">
            <p className="text-sm font-semibold">Áudio pronto · {Math.max(1, Math.floor(recMs / 1000))}s</p>
          </div>
        </div>
        <div className="flex gap-2 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
          <button
            type="button"
            className="h-12 flex-1 rounded-2xl border border-white/30 text-sm"
            onClick={() => {
              setCurrent({ hasAudio: false, audioMs: 0 });
              setMode("record");
            }}
          >
            Regravar
          </button>
          <button
            type="button"
            className="h-12 flex-[1.4] rounded-2xl bg-[var(--brand-green)] text-sm font-semibold"
            onClick={confirmSend}
          >
            Enviar para IA
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="relative min-h-[28%] flex-1">
        {current.photoDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.photoDataUrl}
            alt=""
            className={cn(
              "h-full w-full object-cover",
              recording && "opacity-40",
            )}
          />
        ) : null}
        {recording ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-red-700/55">
            <div className="relative flex size-24 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-white/25" />
              <span className="absolute inset-2 animate-pulse rounded-full bg-white/15" />
              <span className="relative flex size-16 items-center justify-center rounded-full bg-white text-red-600 shadow-lg">
                <Mic className="size-8" />
              </span>
            </div>
            <p className="text-base font-bold tracking-wide text-white">
              Gravando… {Math.floor(recMs / 1000)}s
            </p>
            <div className="flex h-10 items-end gap-1">
              {Array.from({ length: 12 }).map((_, i) => (
                <span
                  key={i}
                  className="w-1.5 animate-pulse rounded-full bg-white/90"
                  style={{
                    height: `${10 + ((i * 17) % 28)}px`,
                    animationDelay: `${i * 45}ms`,
                  }}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
      {/* Persistent dock — visible before AND during recording */}
      <div
        className={cn(
          "shrink-0 rounded-t-3xl px-3 pb-2 pt-3",
          recording ? "bg-red-700" : "bg-zinc-100",
        )}
      >
        <div className="mx-auto max-w-sm">
          <VoiceChecklist
            checked={checked}
            onToggle={toggleItem}
            tone={recording ? "dark" : "light"}
          />
        </div>
      </div>
      <div
        className={cn(
          "flex flex-col items-center gap-2 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3",
          recording ? "bg-red-700" : "bg-zinc-950",
        )}
      >
        <MicBar recording={recording} onStart={startRec} onStop={stopRec} />
        {!recording ? (
          <button
            type="button"
            className="text-xs text-white/50 underline"
            onClick={() => setMode("camera")}
          >
            Trocar foto
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** B — Split: photo strip + checklist body always */
function RecordSplit(props: ReturnType<typeof useSession>) {
  const {
    current,
    recording,
    checked,
    toggleItem,
    startRec,
    stopRec,
    mode,
    setMode,
    setCurrent,
    recMs,
    confirmSend,
  } = props;

  if (mode === "confirm") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <p className="text-sm font-semibold">
          Áudio pronto · {Math.max(1, Math.floor(recMs / 1000))}s
        </p>
        <div className="flex w-full max-w-sm gap-2">
          <button
            type="button"
            className="h-12 flex-1 rounded-2xl border border-white/30 text-sm"
            onClick={() => {
              setCurrent({ hasAudio: false, audioMs: 0 });
              setMode("record");
            }}
          >
            Regravar
          </button>
          <button
            type="button"
            className="h-12 flex-[1.4] rounded-2xl bg-[var(--brand-green)] text-sm font-semibold"
            onClick={confirmSend}
          >
            Enviar para IA
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative h-[28vh] shrink-0 overflow-hidden">
        {current.photoDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.photoDataUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : null}
        <div
          className={cn(
            "absolute inset-0",
            recording ? "bg-red-700/35" : "bg-black/10",
          )}
        />
      </div>
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto px-3 py-3",
          recording ? "bg-red-700" : "bg-zinc-100",
        )}
      >
        <VoiceChecklist
          checked={checked}
          onToggle={toggleItem}
          tone={recording ? "dark" : "light"}
        />
      </div>
      <div
        className={cn(
          "flex flex-col items-center gap-2 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3",
          recording ? "bg-red-800" : "bg-zinc-950",
        )}
      >
        <MicBar recording={recording} onStart={startRec} onStop={stopRec} />
      </div>
    </div>
  );
}

/** C — Checklist-first: thumbnail + full checklist surface */
function RecordFirst(props: ReturnType<typeof useSession>) {
  const {
    current,
    recording,
    checked,
    toggleItem,
    startRec,
    stopRec,
    mode,
    setMode,
    setCurrent,
    recMs,
    confirmSend,
  } = props;

  if (mode === "confirm") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <p className="text-sm font-semibold">
          Áudio pronto · {Math.max(1, Math.floor(recMs / 1000))}s
        </p>
        <div className="flex w-full max-w-sm gap-2">
          <button
            type="button"
            className="h-12 flex-1 rounded-2xl border border-white/30 text-sm"
            onClick={() => {
              setCurrent({ hasAudio: false, audioMs: 0 });
              setMode("record");
            }}
          >
            Regravar
          </button>
          <button
            type="button"
            className="h-12 flex-[1.4] rounded-2xl bg-[var(--brand-green)] text-sm font-semibold"
            onClick={confirmSend}
          >
            Enviar para IA
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        recording ? "bg-red-700" : "bg-zinc-100",
      )}
    >
      <div className="flex shrink-0 items-center gap-3 px-3 py-2">
        {current.photoDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.photoDataUrl}
            alt=""
            className="h-16 w-12 rounded-xl object-cover ring-2 ring-white/30"
          />
        ) : null}
        <div className={cn("min-w-0 text-xs", recording ? "text-white/80" : "text-muted-foreground")}>
          Passo 2 · Áudio
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
        <VoiceChecklist
          checked={checked}
          onToggle={toggleItem}
          tone={recording ? "dark" : "light"}
        />
      </div>
      <div
        className={cn(
          "flex flex-col items-center gap-2 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2",
          recording ? "bg-red-800" : "bg-zinc-950",
        )}
      >
        <MicBar recording={recording} onStart={startRec} onStop={stopRec} />
        {!recording ? (
          <button
            type="button"
            className="text-xs text-white/50 underline"
            onClick={() => setMode("camera")}
          >
            Trocar foto
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SessionVariant({ layout }: { layout: Layout }) {
  const s = useSession(layout);
  const [exitKind, setExitKind] = useState<"cancel" | "finish" | null>(null);

  if (s.mode === "lobby") {
    return (
      <Lobby
        layout={layout}
        onStart={s.startSession}
        batchCount={s.batchQueue.length}
      />
    );
  }

  return (
    <>
      <SessionChrome
        layout={layout}
        mode={s.mode}
        recording={s.recording}
        recMs={s.recMs}
        checked={s.checked}
        piecesDone={s.piecesDone}
        onCancel={() => setExitKind("cancel")}
        onFinish={() => setExitKind("finish")}
      >
        {s.mode === "camera" ? <CameraStep onSnap={s.snap} /> : null}
        {s.mode === "record" || s.mode === "confirm"
          ? layout === "dock"
            ? <RecordDock {...s} />
            : layout === "split"
              ? <RecordSplit {...s} />
              : <RecordFirst {...s} />
          : null}
        {s.mode === "working" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <Sparkles className="size-10 animate-pulse text-[var(--brand-green)]" />
            <p className="text-sm font-semibold">Processando…</p>
          </div>
        ) : null}
        {s.mode === "preview" && s.draft ? (
          <PreviewStep
            draft={s.draft}
            setDraft={s.setDraft}
            onNext={s.nextPiece}
          />
        ) : null}
      </SessionChrome>

      <ConfirmDialog
        open={exitKind === "cancel"}
        title="Cancelar sessão?"
        body="Descarta a peça em andamento."
        confirmLabel="Cancelar"
        destructive
        onCancel={() => setExitKind(null)}
        onConfirm={() => {
          setExitKind(null);
          s.exitToLobby();
        }}
      />
      <ConfirmDialog
        open={exitKind === "finish"}
        title="Finalizar sessão?"
        body={`${s.batchQueue.length} peça(s) aprovadas.`}
        confirmLabel="Finalizar"
        onCancel={() => setExitKind(null)}
        onConfirm={() => {
          setExitKind(null);
          s.exitToLobby();
        }}
      />
    </>
  );
}

export function VariantA() {
  return <SessionVariant layout="dock" />;
}
export function VariantB() {
  return <SessionVariant layout="split" />;
}
export function VariantC() {
  return <SessionVariant layout="first" />;
}
