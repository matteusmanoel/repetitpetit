"use client";

/**
 * A — Form-first (rev.3): footer < Novo item >, nome+desc alinhados à thumb,
 * marca|categoria, chips justificados.
 */

import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  List,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  BRANDS,
  CATEGORIES,
  GENDERS,
  SERIES_DRAFTS,
  SIZES,
  type ProtoDraft,
} from "../mock";
import {
  ChipRow,
  ListPickButton,
  ProtoField,
  ProtoInput,
  ProtoTextarea,
  StateDump,
} from "../shared";
import { cn } from "@/lib/utils";

export const VARIANT_A_META = {
  key: "A",
  label: "Form-first strip",
};

function emptyDraft(n: number): ProtoDraft {
  return {
    id: `p-new-${n}`,
    name: "",
    priceDisplay: "",
    size: "P",
    brand: "Sem marca",
    category: "Sem categoria",
    gender: "unissex",
    condition: "seminovo",
    description: "",
    publish: true,
    photoUrl: `https://placehold.co/600x800/e4e4e7/1a1a1a?text=${n}`,
  };
}

export function VariantA() {
  const [items, setItems] = useState<ProtoDraft[]>(() =>
    SERIES_DRAFTS.map((d) => ({ ...d })),
  );
  const [index, setIndex] = useState(0);
  const [log, setLog] = useState("idle");
  const [photoOpen, setPhotoOpen] = useState(false);
  const [seriesOpen, setSeriesOpen] = useState(false);

  const draft = items[index]!;
  const total = items.length;

  useEffect(() => {
    if (!photoOpen && !seriesOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [photoOpen, seriesOpen]);

  function patch(p: Partial<ProtoDraft>) {
    setItems((list) =>
      list.map((item, i) => (i === index ? { ...item, ...p } : item)),
    );
  }

  function go(next: number) {
    setIndex(Math.max(0, Math.min(total - 1, next)));
    setLog(`nav → ${next + 1}/${total}`);
  }

  function onNovoItem() {
    setLog(`saved ${draft.id} @ ${new Date().toLocaleTimeString()}`);
    if (index < total - 1) {
      go(index + 1);
      return;
    }
    const next = emptyDraft(total + 1);
    setItems((list) => [...list, next]);
    setIndex(total);
    setLog(`novo item → ${total + 1}`);
  }

  return (
    <div className="mx-auto flex h-dvh max-w-lg flex-col bg-zinc-100">
      <header className="flex shrink-0 items-center justify-between gap-2 px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">
            Preview · {index + 1}/{total}
          </p>
          <h1 className="truncate text-lg font-semibold">Revisar peça</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setSeriesOpen(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-medium ring-1 ring-black/10"
            aria-label="Lista da série"
          >
            <List className="size-4" />
            Série
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-medium ring-1 ring-black/10"
          >
            <Camera className="size-4" />
            Refazer
          </button>
        </div>
      </header>

      {/* Thumb | Nome + Descrição (mesma altura) */}
      <div className="flex shrink-0 gap-3 px-4 pb-3">
        <button
          type="button"
          onClick={() => setPhotoOpen(true)}
          className="relative h-36 w-[6.75rem] shrink-0 overflow-hidden rounded-2xl ring-1 ring-black/5"
          aria-label="Ampliar foto"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={draft.photoUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        </button>
        <div className="flex min-h-36 min-w-0 flex-1 flex-col gap-2">
          <ProtoInput
            value={draft.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="Nome *"
            aria-label="Nome"
            className="shrink-0"
          />
          <ProtoTextarea
            value={draft.description}
            onChange={(e) => patch({ description: e.target.value })}
            placeholder="Descrição"
            aria-label="Descrição"
            className="min-h-0 flex-1 resize-none"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 pb-4">
        {/* Preço | Tamanho — chips justificados */}
        <div className="grid grid-cols-[6.75rem_1fr] gap-3">
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
                aria-label="Preço"
              />
            </div>
          </ProtoField>
          <ProtoField label="Tamanho">
            <ChipRow
              justified
              options={[...SIZES]}
              value={draft.size}
              onChange={(size) => patch({ size })}
            />
          </ProtoField>
        </div>

        {/* Sexo | Novo — chips justificados */}
        <div className="grid grid-cols-[1fr_auto] items-end gap-3">
          <ProtoField label="Sexo">
            <ChipRow
              justified
              options={GENDERS}
              value={draft.gender}
              onChange={(gender) => patch({ gender })}
            />
          </ProtoField>
          <ProtoField label="Condição" className="w-[6.75rem]">
            <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-3">
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
        </div>

        {/* Marca | Categoria */}
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

        <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-black/5">
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
        <StateDump
          draft={{
            index,
            id: draft.id,
            name: draft.name,
            condition: draft.condition,
          }}
        />
      </div>

      {/* Footer: < | Novo item | > */}
      <div className="flex shrink-0 items-center gap-2 border-t border-black/5 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          disabled={index <= 0}
          onClick={() => go(index - 1)}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-foreground ring-1 ring-black/10 disabled:opacity-40"
          aria-label="Anterior"
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          type="button"
          onClick={onNovoItem}
          className="flex h-12 min-w-0 flex-1 items-center justify-center rounded-xl bg-[var(--brand-green)] text-base font-semibold text-white"
        >
          Novo item
        </button>
        <button
          type="button"
          disabled={index >= total - 1}
          onClick={() => go(index + 1)}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-foreground ring-1 ring-black/10 disabled:opacity-40"
          aria-label="Próxima"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      {photoOpen ? (
        <div className="fixed inset-0 z-[90] flex flex-col bg-black/90">
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <p className="text-sm font-semibold">
              Foto · {index + 1}/{total}
            </p>
            <button
              type="button"
              className="rounded-full p-2 hover:bg-white/10"
              onClick={() => setPhotoOpen(false)}
              aria-label="Fechar"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={draft.photoUrl}
              alt=""
              className="max-h-full max-w-full rounded-2xl object-contain"
            />
          </div>
        </div>
      ) : null}

      {seriesOpen ? (
        <div className="fixed inset-0 z-[85] flex flex-col justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Fechar"
            onClick={() => setSeriesOpen(false)}
          />
          <div className="relative z-10 flex max-h-[50dvh] flex-col rounded-t-3xl bg-white shadow-xl">
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-zinc-300" />
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-base font-semibold">Série ({total} peças)</p>
              <button
                type="button"
                className="rounded-full p-2 hover:bg-muted"
                onClick={() => setSeriesOpen(false)}
                aria-label="Fechar"
              >
                <X className="size-5" />
              </button>
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {items.map((item, i) => {
                const active = i === index;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left",
                        active
                          ? "bg-[var(--brand-green)]/10"
                          : "hover:bg-muted",
                      )}
                      onClick={() => {
                        setIndex(i);
                        setSeriesOpen(false);
                        setLog(`jump → ${i + 1}/${total}`);
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.photoUrl}
                        alt=""
                        className="h-12 w-10 shrink-0 rounded-lg object-cover"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {i + 1}. {item.name || "Sem nome"}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          R$ {item.priceDisplay || "—"} · {item.size}
                        </span>
                      </span>
                      {active ? (
                        <Check className="size-5 shrink-0 text-[var(--brand-green)]" />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
