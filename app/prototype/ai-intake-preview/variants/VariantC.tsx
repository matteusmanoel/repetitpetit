"use client";

/**
 * C — Filmstrip + sheet (mock rev.2).
 */

import { Camera } from "lucide-react";
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
  ProtoField,
  ProtoInput,
  ProtoTextarea,
  StateDump,
} from "../shared";

export const VARIANT_C_META = {
  key: "C",
  label: "Filmstrip + sheet",
};

export function VariantC() {
  const [draft, setDraft] = useState<ProtoDraft>({ ...INITIAL_DRAFT });
  const [log, setLog] = useState("idle");

  function patch(p: Partial<ProtoDraft>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  return (
    <div className="mx-auto flex h-dvh max-w-lg flex-col bg-zinc-950">
      <div className="relative h-[22vh] min-h-[7.5rem] max-h-40 shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={draft.photoUrl}
          alt=""
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent px-3 pb-8 pt-3">
          <p className="text-sm font-semibold text-white">Preview</p>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-1 rounded-full bg-white/95 px-3 text-xs font-semibold"
          >
            <Camera className="size-3.5" />
            Refazer
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-3xl bg-white">
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-zinc-300" />
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 pb-28 pt-3">
          <ProtoField label="Nome *">
            <ProtoInput
              value={draft.name}
              onChange={(e) => patch({ name: e.target.value })}
            />
          </ProtoField>
          <div className="grid grid-cols-2 gap-3">
            <ProtoField label="Preço *">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium">
                  R$
                </span>
                <ProtoInput
                  className="pl-10"
                  value={draft.priceDisplay}
                  onChange={(e) => patch({ priceDisplay: e.target.value })}
                  inputMode="decimal"
                />
              </div>
            </ProtoField>
            <ProtoField label="Tamanho">
              <ChipRow
                options={[...SIZES]}
                value={draft.size}
                onChange={(size) => patch({ size })}
              />
            </ProtoField>
          </div>
          <ProtoField label="Sexo">
            <ChipRow
              options={GENDERS}
              value={draft.gender}
              onChange={(gender) => patch({ gender })}
            />
          </ProtoField>
          <ProtoField label="Condição">
            <label className="flex h-12 w-fit items-center gap-2 rounded-2xl border border-black/10 px-3">
              <input
                type="checkbox"
                className="size-5 accent-[var(--brand-green)]"
                checked={draft.condition === "novo"}
                onChange={(e) =>
                  patch({ condition: e.target.checked ? "novo" : "seminovo" })
                }
              />
              <span className="text-sm font-semibold">Novo</span>
            </label>
          </ProtoField>
          <div className="grid grid-cols-2 gap-3">
            <ProtoField label="Marca">
              <ListPickButton
                label="Marca"
                value={draft.brand}
                options={[...BRANDS]}
                onChange={(brand) => patch({ brand })}
              />
            </ProtoField>
            <ProtoField label="Categoria">
              <ListPickButton
                label="Categoria"
                value={draft.category}
                options={[...CATEGORIES]}
                onChange={(category) => patch({ category })}
              />
            </ProtoField>
          </div>
          <ProtoField label="Descrição">
            <ProtoTextarea
              value={draft.description}
              onChange={(e) => patch({ description: e.target.value })}
              rows={4}
            />
          </ProtoField>
          <label className="flex items-center gap-3 rounded-2xl bg-muted/40 px-4 py-3">
            <input
              type="checkbox"
              className="size-5 accent-[var(--brand-green)]"
              checked={draft.publish}
              onChange={(e) => patch({ publish: e.target.checked })}
            />
            <span className="text-sm font-medium">Publicar no catálogo</span>
          </label>
          <p className="text-[11px] text-muted-foreground">
            Estado: <strong>{log}</strong>
          </p>
          <StateDump draft={draft} />
        </div>

        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-lg">
          <ApproveBar
            onApprove={() =>
              setLog(`sheet-ok @ ${new Date().toLocaleTimeString()}`)
            }
          />
        </div>
      </div>
    </div>
  );
}
