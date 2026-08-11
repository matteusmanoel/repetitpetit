"use client";

/**
 * B — Checklist gate (atualizado ao mock rev.2 — condição novo/seminovo).
 */

import { Camera, ChevronRight } from "lucide-react";
import { useState } from "react";

import {
  BRANDS,
  CATEGORIES,
  GENDERS,
  INITIAL_DRAFT,
  SIZES,
  type ProtoDraft,
} from "../mock";
import {
  ApproveBar,
  ChipRow,
  ListPickButton,
  ProtoInput,
  ProtoTextarea,
  StateDump,
} from "../shared";
import { cn } from "@/lib/utils";

export const VARIANT_B_META = {
  key: "B",
  label: "Checklist gate",
};

function Row({
  label,
  children,
  ok,
}: {
  label: string;
  children: React.ReactNode;
  ok?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-white p-4",
        ok === false ? "border-red-400" : "border-black/5",
      )}
    >
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}

export function VariantB() {
  const [draft, setDraft] = useState<ProtoDraft>({ ...INITIAL_DRAFT });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [log, setLog] = useState("idle");

  function patch(p: Partial<ProtoDraft>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  const nameOk = draft.name.trim().length >= 2;
  const priceOk = draft.priceDisplay.trim().length > 0;

  return (
    <div className="mx-auto flex h-dvh max-w-lg flex-col bg-zinc-50">
      <header className="relative shrink-0 overflow-hidden bg-zinc-900 px-4 pb-5 pt-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-white/60">Peça #4 · lote</p>
            <h1 className="text-xl font-semibold">Conferir e seguir</h1>
          </div>
          <button
            type="button"
            className="relative h-16 w-14 overflow-hidden rounded-xl ring-2 ring-white/30"
            aria-label="Refazer foto"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={draft.photoUrl}
              alt=""
              className="h-full w-full object-cover"
            />
            <span className="absolute inset-x-0 bottom-0 bg-black/50 py-0.5 text-center text-[9px] font-bold">
              <Camera className="mx-auto size-3" />
            </span>
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4">
        <Row label="Nome *" ok={nameOk}>
          <ProtoInput
            value={draft.name}
            onChange={(e) => patch({ name: e.target.value })}
          />
        </Row>
        <Row label="Preço *" ok={priceOk}>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium">
              R$
            </span>
            <ProtoInput
              className="pl-10 text-lg font-bold"
              value={draft.priceDisplay}
              onChange={(e) => patch({ priceDisplay: e.target.value })}
              inputMode="decimal"
            />
          </div>
        </Row>
        <Row label="Tamanho *">
          <ChipRow
            options={[...SIZES]}
            value={draft.size}
            onChange={(size) => patch({ size })}
          />
        </Row>

        <button
          type="button"
          onClick={() => setDetailsOpen((v) => !v)}
          className="flex h-12 w-full items-center justify-between rounded-2xl bg-white px-4 text-sm font-semibold ring-1 ring-black/5"
        >
          {detailsOpen ? "Ocultar detalhes" : "Marca, sexo, descrição…"}
          <ChevronRight
            className={cn("size-4 transition", detailsOpen && "rotate-90")}
          />
        </button>

        {detailsOpen ? (
          <div className="space-y-3">
            <Row label="Sexo">
              <ChipRow
                options={GENDERS}
                value={draft.gender}
                onChange={(gender) => patch({ gender })}
              />
            </Row>
            <Row label="Condição">
              <label className="flex h-12 items-center gap-2 rounded-2xl border border-black/10 px-3">
                <input
                  type="checkbox"
                  className="size-5 accent-[var(--brand-green)]"
                  checked={draft.condition === "novo"}
                  onChange={(e) =>
                    patch({
                      condition: e.target.checked ? "novo" : "seminovo",
                    })
                  }
                />
                <span className="text-sm font-semibold">Novo (senão seminovo)</span>
              </label>
            </Row>
            <Row label="Marca">
              <ListPickButton
                label="Marca"
                value={draft.brand}
                options={[...BRANDS]}
                onChange={(brand) => patch({ brand })}
              />
            </Row>
            <Row label="Categoria">
              <ListPickButton
                label="Categoria"
                value={draft.category}
                options={[...CATEGORIES]}
                onChange={(category) => patch({ category })}
              />
            </Row>
            <Row label="Descrição">
              <ProtoTextarea
                value={draft.description}
                onChange={(e) => patch({ description: e.target.value })}
              />
            </Row>
          </div>
        ) : null}

        <label className="flex items-center gap-3 rounded-2xl bg-[var(--brand-green)]/10 px-4 py-3 ring-1 ring-[var(--brand-green)]/25">
          <input
            type="checkbox"
            className="size-5 accent-[var(--brand-green)]"
            checked={draft.publish}
            onChange={(e) => patch({ publish: e.target.checked })}
          />
          <span className="text-sm font-semibold">Publicar agora</span>
        </label>

        <p className="text-[11px] text-muted-foreground">
          Estado: <strong>{log}</strong>
        </p>
        <StateDump draft={{ ...draft, detailsOpen }} />
      </div>

      <ApproveBar
        label="Confirmar e próxima"
        onApprove={() => {
          if (!nameOk || !priceOk) {
            setLog("blocked — essencial incompleto");
            return;
          }
          setLog(`ok @ ${new Date().toLocaleTimeString()}`);
        }}
      />
    </div>
  );
}
