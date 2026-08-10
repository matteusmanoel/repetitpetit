"use client";

/**
 * PROTOTYPE Variant B — Ciclo com revisão
 * Flow: imagem → áudio → confirmar → preview fullscreen → aprovar → próxima
 * Finalizar/Cancelar com confirm dialog. Sem miniaturas / sem fila.
 */

import { useEffect, useRef, useState } from "react";
import {
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

export const VARIANT_B_META = {
  key: "B",
  label: "Ciclo + preview",
} as const;

type Mode = "shell" | "camera" | "preview";

export function VariantB() {
  const {
    current,
    setCurrent,
    approveCurrent,
    resetCurrent,
    piecesDone,
    batchQueue,
  } = usePrototypeState();

  const [mode, setMode] = useState<Mode>("shell");
  const [recording, setRecording] = useState(false);
  const [recMs, setRecMs] = useState(0);
  const [confirmSend, setConfirmSend] = useState(false);
  const [confirmExit, setConfirmExit] = useState<"cancel" | "finish" | null>(
    null,
  );
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState<PieceDraft | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!recording) return;
    timer.current = window.setInterval(() => setRecMs((m) => m + 100), 100);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [recording]);

  function snap() {
    setCurrent({
      photoDataUrl: stubPhotoDataUrl(`Peça ${piecesDone + 1}`),
      status: "ready",
    });
    setMode("shell");
  }

  function toggleRec() {
    if (!current.photoDataUrl || sending) return;
    if (!recording) {
      setRecording(true);
      setRecMs(0);
      setCurrent({ status: "recording" });
      return;
    }
    setRecording(false);
    setCurrent({ hasAudio: true, audioMs: recMs, status: "ready" });
    setConfirmSend(true);
  }

  function sendToAi() {
    setConfirmSend(false);
    setSending(true);
    setCurrent({ status: "sending" });
    window.setTimeout(() => {
      const filled = applyFakeAi({
        ...current,
        hasAudio: true,
        audioMs: recMs,
      });
      setDraft(filled);
      setCurrent(filled);
      setSending(false);
      setMode("preview");
    }, 800);
  }

  function approve() {
    approveCurrent();
    setDraft(null);
    setRecMs(0);
    setMode("shell");
  }

  // —— Fullscreen preview session ——
  if (mode === "preview" && draft) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col bg-zinc-50">
        <StateDebug
          payload={{
            variant: "B",
            mode,
            recording,
            piecesDone,
            approved: batchQueue.length,
            draft: draft.name,
          }}
        />
        <header className="flex items-center justify-between border-b border-black/5 bg-white px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button
            type="button"
            className="inline-flex h-10 items-center gap-1 rounded-xl px-3 text-sm font-medium text-[var(--brand-pink)]"
            onClick={() => setConfirmExit("cancel")}
          >
            <X className="size-4" />
            Cancelar
          </button>
          <span className="text-sm font-semibold">Revisar peça</span>
          <button
            type="button"
            className="inline-flex h-10 items-center gap-1 rounded-xl bg-[var(--brand-green)] px-3 text-sm font-semibold text-white"
            onClick={() => setConfirmExit("finish")}
          >
            <Check className="size-4" />
            Finalizar
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 pb-28">
          <div className="mx-auto flex max-w-lg flex-col gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={draft.photoDataUrl ?? ""}
              alt=""
              className="aspect-[4/3] w-full rounded-3xl object-cover"
            />
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

        <div className="fixed bottom-0 left-0 right-0 border-t border-black/5 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--brand-green)] text-sm font-semibold text-white"
            onClick={approve}
          >
            <Check className="size-4" />
            Aprovar e próxima peça
          </button>
        </div>

        <ConfirmDialog
          open={confirmExit === "cancel"}
          title="Cancelar esta peça?"
          body="O rascunho atual será descartado e você volta ao shell padrão."
          confirmLabel="Descartar"
          destructive
          onCancel={() => setConfirmExit(null)}
          onConfirm={() => {
            setConfirmExit(null);
            setDraft(null);
            resetCurrent();
            setRecMs(0);
            setMode("shell");
          }}
        />
        <ConfirmDialog
          open={confirmExit === "finish"}
          title="Finalizar sessão?"
          body={`Você já aprovou ${batchQueue.length} peça(s). Sair do modo revisão e voltar ao admin.`}
          confirmLabel="Finalizar"
          onCancel={() => setConfirmExit(null)}
          onConfirm={() => {
            setConfirmExit(null);
            setDraft(null);
            resetCurrent();
            setMode("shell");
          }}
        />
      </div>
    );
  }

  // —— Fullscreen camera ——
  if (mode === "camera") {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col bg-black">
        <div className="flex items-center justify-between px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
          <span className="text-sm font-medium">Capturar peça</span>
          <button
            type="button"
            className="rounded-full bg-white/15 p-2"
            onClick={() => setMode("shell")}
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="relative flex-1">
          <div className="absolute inset-0 flex items-center justify-center text-white/40">
            <Camera className="size-20" />
          </div>
          <div className="pointer-events-none absolute inset-6 rounded-3xl border-2 border-white/25" />
        </div>
        <div className="flex justify-center pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
          <button
            type="button"
            className="h-[4.5rem] w-[4.5rem] rounded-full border-[5px] border-white bg-white/25"
            onClick={snap}
            aria-label="Capturar foto"
          />
        </div>
      </div>
    );
  }

  // —— Shell capture ——
  return (
    <ProtoAdminShell>
      <StateDebug
        payload={{
          variant: "B",
          mode,
          recording,
          hasPhoto: Boolean(current.photoDataUrl),
          hasAudio: current.hasAudio,
          piecesDone,
          approved: batchQueue.length,
        }}
      />

      <div className="flex flex-1 flex-col pb-[calc(5.75rem+env(safe-area-inset-bottom))]">
        <div className="border-b border-black/5 bg-white px-4 py-2 text-xs text-muted-foreground">
          Ciclo: foto → áudio → confirma → revisa → próxima ·{" "}
          <strong className="text-foreground">{piecesDone} ok</strong>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4">
          <button
            type="button"
            onClick={() => setMode("camera")}
            className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-zinc-900 text-left"
          >
            {current.photoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={current.photoDataUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full flex-col items-center justify-center gap-2 text-white">
                <Camera className="size-10 opacity-70" />
                <span className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-foreground">
                  Abrir câmera fullscreen
                </span>
              </span>
            )}
            {recording ? (
              <span className="absolute inset-x-3 top-3 flex items-center justify-center gap-2 rounded-2xl bg-red-600 py-2 text-sm font-semibold text-white">
                <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                Gravando… {Math.floor(recMs / 1000)}s
              </span>
            ) : null}
            {sending ? (
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-white">
                <Sparkles className="size-6 animate-pulse" />
                Gerando preview…
              </span>
            ) : null}
          </button>

          <Checklist recording={recording || Boolean(current.hasAudio)} />
        </div>
      </div>

      <div className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom))] left-0 right-0 z-50 mx-auto max-w-lg px-4">
        <div
          className={cn(
            "flex items-center gap-3 rounded-3xl border px-3 py-2 shadow-lg",
            recording
              ? "border-red-600 bg-red-600 text-white"
              : "border-black/10 bg-white",
          )}
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {recording
                ? "Gravando…"
                : current.hasAudio
                  ? "Áudio capturado"
                  : "Áudio da peça"}
            </p>
            <p
              className={cn(
                "text-[11px]",
                recording ? "text-white/80" : "text-muted-foreground",
              )}
            >
              {recording
                ? "Toque Parar → depois confirme o envio"
                : "Mic sticky · confirmação obrigatória antes da IA"}
            </p>
          </div>
          <button
            type="button"
            disabled={!current.photoDataUrl || sending}
            onClick={toggleRec}
            className={cn(
              "flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full text-white disabled:opacity-40",
              recording ? "bg-zinc-900" : "bg-red-600",
            )}
          >
            {recording ? (
              <Square className="size-5 fill-current" />
            ) : (
              <Mic className="size-5" />
            )}
            <span className="text-[9px] font-bold">
              {recording ? "Parar" : "Gravar"}
            </span>
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmSend}
        title="Processar com IA?"
        body="Confirme para rodar STT + LLM e abrir o preview fullscreen desta peça."
        confirmLabel="Processar"
        cancelLabel="Regravar"
        onCancel={() => {
          setConfirmSend(false);
          setCurrent({ hasAudio: false, audioMs: 0 });
        }}
        onConfirm={sendToAi}
      />
    </ProtoAdminShell>
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

function Checklist({ recording }: { recording: boolean }) {
  const items = ["Categoria", "Cor", "Idade", "Condição", "Preço"];
  return (
    <div
      className={cn(
        "rounded-2xl border bg-white p-3 transition",
        recording ? "border-[var(--brand-green)]" : "border-border",
      )}
    >
      <p className="text-xs font-semibold">Diga no áudio</p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <li
            key={item}
            className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
