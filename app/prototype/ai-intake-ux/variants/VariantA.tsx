"use client";

/**
 * PROTOTYPE Variant A — Throughput
 * Flow: imagem → áudio → confirmar envio → próxima peça
 * Preview em lote depois. Shell + sticky mic. Sem miniaturas.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Camera,
  Check,
  ListOrdered,
  Mic,
  Square,
  Upload,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

import {
  applyFakeAi,
  stubPhotoDataUrl,
  usePrototypeState,
} from "../prototype-state";
import { ConfirmDialog, ProtoAdminShell, StateDebug } from "../shared";

export const VARIANT_A_META = {
  key: "A",
  label: "Throughput (fila)",
} as const;

type Phase = "capture" | "audio" | "confirm" | "sending" | "batch";

export function VariantA() {
  const { current, setCurrent, batchQueue, completeCurrentToBatch, piecesDone } =
    usePrototypeState();
  const [phase, setPhase] = useState<Phase>("capture");
  const [cameraFs, setCameraFs] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recMs, setRecMs] = useState(0);
  const [confirmSend, setConfirmSend] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!recording) return;
    timer.current = window.setInterval(() => setRecMs((m) => m + 100), 100);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [recording]);

  function takePhoto() {
    setCurrent({
      photoDataUrl: stubPhotoDataUrl(`Peça ${piecesDone + 1}`),
      status: "ready",
    });
    setCameraFs(false);
    setPhase("audio");
  }

  function toggleRec() {
    if (!current.photoDataUrl) return;
    if (!recording) {
      setRecording(true);
      setRecMs(0);
      setCurrent({ status: "recording" });
      return;
    }
    setRecording(false);
    setCurrent({ hasAudio: true, audioMs: recMs, status: "ready" });
    setPhase("confirm");
    setConfirmSend(true);
  }

  function sendToAi() {
    setConfirmSend(false);
    setPhase("sending");
    setCurrent({ status: "sending" });
    window.setTimeout(() => {
      // Throughput: AI runs in background; piece goes to batch queue
      completeCurrentToBatch();
      setPhase("capture");
      setRecMs(0);
    }, 900);
  }

  const stickyPad =
    "pb-[calc(5.5rem+env(safe-area-inset-bottom))]";

  return (
    <ProtoAdminShell>
      <StateDebug
        payload={{
          variant: "A",
          phase,
          recording,
          hasPhoto: Boolean(current.photoDataUrl),
          hasAudio: current.hasAudio,
          queue: batchQueue.length,
          piecesDone,
        }}
      />

      {phase === "batch" ? (
        <div className={cn("flex flex-1 flex-col gap-3 p-4", stickyPad)}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">
              Fila de preview ({batchQueue.length})
            </h2>
            <button
              type="button"
              className="text-sm text-[var(--brand-green)]"
              onClick={() => setPhase("capture")}
            >
              Voltar a capturar
            </button>
          </div>
          {batchQueue.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma peça enviada ainda.
            </p>
          ) : (
            <ul className="space-y-2">
              {batchQueue.map((p, i) => {
                const filled = applyFakeAi(p);
                return (
                  <li
                    key={p.id}
                    className="flex gap-3 rounded-2xl border border-border bg-white p-3"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.photoDataUrl ?? ""}
                      alt=""
                      className="h-16 w-12 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="font-medium">
                        #{i + 1} · {filled.name}
                      </p>
                      <p className="text-muted-foreground">
                        {filled.category} · {filled.size} · R$ {filled.price}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <div className={cn("flex flex-1 flex-col", stickyPad)}>
          <div className="flex items-center gap-2 border-b border-black/5 bg-white px-4 py-2">
            <StepChip active={phase === "capture"} done={Boolean(current.photoDataUrl)}>
              1 Foto
            </StepChip>
            <StepChip
              active={phase === "audio" || recording}
              done={current.hasAudio}
            >
              2 Áudio
            </StepChip>
            <StepChip
              active={phase === "confirm" || phase === "sending"}
              done={false}
            >
              3 Enviar
            </StepChip>
            <button
              type="button"
              className="ml-auto inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium"
              onClick={() => setPhase("batch")}
            >
              <ListOrdered className="size-3.5" />
              Fila ({batchQueue.length})
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-3 p-4">
            <p className="text-sm text-muted-foreground">
              Uma peça por vez. Sem miniaturas. Preview em lote na fila.
            </p>

            <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-zinc-900">
              {current.photoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={current.photoDataUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-white">
                  <Camera className="size-10 opacity-70" />
                  <button
                    type="button"
                    className="h-11 rounded-2xl bg-white px-5 text-sm font-semibold text-foreground"
                    onClick={() => setCameraFs(true)}
                  >
                    Abrir câmera
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs underline opacity-80"
                    onClick={takePhoto}
                  >
                    <Upload className="size-3" />
                    Usar foto stub
                  </button>
                </div>
              )}
              {recording ? (
                <div className="absolute inset-x-0 top-0 flex items-center justify-center gap-2 bg-red-600/90 py-2 text-sm font-semibold text-white">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" />
                  Gravando… {Math.floor(recMs / 1000)}s
                </div>
              ) : null}
              {phase === "sending" ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-semibold text-white">
                  Enviando para IA…
                </div>
              ) : null}
            </div>

            {current.photoDataUrl && !recording ? (
              <button
                type="button"
                className="self-start text-xs text-muted-foreground underline"
                onClick={() => {
                  setCurrent({
                    photoDataUrl: null,
                    hasAudio: false,
                    audioMs: 0,
                    status: "idle",
                  });
                  setPhase("capture");
                }}
              >
                Trocar foto
              </button>
            ) : null}

            <div className="rounded-2xl border border-dashed border-black/10 bg-white/70 p-3 text-xs text-muted-foreground">
              Diga no áudio: categoria → marca → cor → tamanho → idade → condição
              → preço
            </div>
          </div>
        </div>
      )}

      {/* Sticky bottom action — above fake bottom nav */}
      {phase !== "batch" ? (
        <div className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom))] left-0 right-0 z-50 mx-auto max-w-lg border-t border-black/5 bg-white/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <p className="min-w-0 flex-1 text-xs text-muted-foreground">
              {recording
                ? "Toque em Parar quando terminar de falar"
                : current.hasAudio
                  ? "Áudio pronto — confirme o envio"
                  : current.photoDataUrl
                    ? "Grave o áudio desta peça"
                    : "Capture a foto primeiro"}
            </p>
            <button
              type="button"
              disabled={!current.photoDataUrl || phase === "sending"}
              onClick={toggleRec}
              className={cn(
                "flex h-14 min-w-14 shrink-0 flex-col items-center justify-center rounded-full text-white shadow-lg disabled:opacity-40",
                recording ? "bg-zinc-900" : "bg-red-600",
              )}
              aria-pressed={recording}
              aria-label={recording ? "Parar gravação" : "Gravar áudio"}
            >
              {recording ? (
                <Square className="size-5 fill-white" />
              ) : (
                <Mic className="size-5" />
              )}
              <span className="mt-0.5 text-[9px] font-semibold">
                {recording ? "Parar" : "Gravar"}
              </span>
            </button>
          </div>
        </div>
      ) : null}

      {cameraFs ? (
        <div className="fixed inset-0 z-[70] flex flex-col bg-black">
          <div className="flex items-center justify-between px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
            <span className="text-sm font-medium">Câmera</span>
            <button
              type="button"
              className="rounded-full bg-white/15 p-2"
              onClick={() => setCameraFs(false)}
              aria-label="Fechar"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="relative flex-1 bg-zinc-800">
            <div className="absolute inset-0 flex items-center justify-center text-white/50">
              <Camera className="size-16" />
            </div>
            <div className="pointer-events-none absolute inset-8 rounded-[2rem] border border-white/30" />
          </div>
          <div className="flex items-center justify-center gap-8 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
            <button
              type="button"
              className="h-[4.5rem] w-[4.5rem] rounded-full border-[5px] border-white bg-white/20"
              onClick={takePhoto}
              aria-label="Capturar"
            />
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmSend}
        title="Enviar áudio para a IA?"
        body="Isso dispara STT + geração do rascunho. Confirme para evitar envios acidentais."
        confirmLabel="Enviar"
        cancelLabel="Regravar"
        onCancel={() => {
          setConfirmSend(false);
          setCurrent({ hasAudio: false, audioMs: 0, status: "ready" });
          setPhase("audio");
        }}
        onConfirm={sendToAi}
      />
    </ProtoAdminShell>
  );
}

function StepChip({
  children,
  active,
  done,
}: {
  children: ReactNode;
  active?: boolean;
  done?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium",
        active
          ? "bg-[var(--brand-green)] text-white"
          : done
            ? "bg-[var(--brand-green)]/15 text-[var(--brand-green)]"
            : "bg-muted text-muted-foreground",
      )}
    >
      {done && !active ? <Check className="size-3" /> : null}
      {children}
    </span>
  );
}
