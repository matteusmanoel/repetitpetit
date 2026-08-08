"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import {
  AGE_LABELS,
  GENDER_LABELS,
  PRICE_MAX,
  PRICE_MIN,
  SIZE_OPTIONS,
  type ProtoAge,
  type ProtoGender,
  type ProtoSize,
} from "../mock-data";
import { useCatalogFiltersPrototype } from "../prototype-state";

const GENDER_ACTIVE: Record<ProtoGender, string> = {
  menino: "bg-[var(--brand-blue)] text-white border-transparent",
  menina: "bg-[var(--brand-pink)] text-white border-transparent",
  unissex: "bg-[var(--brand-green)] text-white border-transparent",
};

function Chip({
  pressed,
  onClick,
  children,
  className,
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex h-10 shrink-0 items-center rounded-full border px-3.5 text-sm font-medium transition",
        pressed
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground hover:bg-muted",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Sexo → idade (só após gênero). */
export function GenderAgeBlock({ compact = false }: { compact?: boolean }) {
  const { filters, patch } = useCatalogFiltersPrototype();
  const genders = Object.keys(GENDER_LABELS) as ProtoGender[];
  const ages = Object.keys(AGE_LABELS) as ProtoAge[];

  return (
    <div className={cn("flex flex-col gap-2", compact && "gap-1.5")}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Sexo e idade
      </p>
      <div className="flex flex-wrap gap-2">
        {genders.map((g) => (
          <button
            key={g}
            type="button"
            aria-pressed={filters.gender === g}
            onClick={() =>
              patch({ gender: filters.gender === g ? null : g })
            }
            className={cn(
              "inline-flex h-10 items-center rounded-full border px-3.5 text-sm font-semibold transition",
              filters.gender === g
                ? GENDER_ACTIVE[g]
                : "border-border bg-background text-foreground",
            )}
          >
            {GENDER_LABELS[g]}
          </button>
        ))}
      </div>
      {filters.gender ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {ages.map((a) => (
            <Chip
              key={a}
              pressed={filters.age === a}
              onClick={() => patch({ age: filters.age === a ? null : a })}
            >
              {AGE_LABELS[a]}
            </Chip>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Escolha o sexo para ver faixas de idade.
        </p>
      )}
    </div>
  );
}

export function SizeBlock() {
  const { filters, patch } = useCatalogFiltersPrototype();

  function toggle(size: ProtoSize) {
    const next = filters.sizes.includes(size)
      ? filters.sizes.filter((s) => s !== size)
      : [...filters.sizes, size];
    patch({ sizes: next });
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Tamanho
      </p>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {SIZE_OPTIONS.map((s) => (
          <Chip
            key={s}
            pressed={filters.sizes.includes(s)}
            onClick={() => toggle(s)}
          >
            {s}
          </Chip>
        ))}
      </div>
    </div>
  );
}

export function AvailabilityBlock() {
  const { filters, patch } = useCatalogFiltersPrototype();
  return (
    <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium">
      <input
        type="checkbox"
        className="size-5 accent-primary"
        checked={filters.soDisponiveis}
        onChange={() => patch({ soDisponiveis: !filters.soDisponiveis })}
      />
      Só disponíveis
    </label>
  );
}

/** Dual range — visual stand-in for shadcn Slider (not installed). */
export function PriceDualSlider({ stacked = false }: { stacked?: boolean }) {
  const { filters, patch } = useCatalogFiltersPrototype();

  return (
    <div className={cn("flex flex-col gap-2", stacked && "w-full")}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Preço
        </p>
        <p className="text-sm font-semibold tabular-nums text-foreground">
          R$ {filters.priceMin} – {filters.priceMax}
        </p>
      </div>
      <div className="relative space-y-3 px-0.5">
        <label className="block text-[10px] text-muted-foreground">
          Mínimo
          <input
            type="range"
            min={PRICE_MIN}
            max={PRICE_MAX}
            value={filters.priceMin}
            onChange={(e) => {
              const v = Number(e.target.value);
              patch({
                priceMin: Math.min(v, filters.priceMax),
              });
            }}
            className="mt-1 w-full accent-[var(--brand-green)]"
          />
        </label>
        <label className="block text-[10px] text-muted-foreground">
          Máximo
          <input
            type="range"
            min={PRICE_MIN}
            max={PRICE_MAX}
            value={filters.priceMax}
            onChange={(e) => {
              const v = Number(e.target.value);
              patch({
                priceMax: Math.max(v, filters.priceMin),
              });
            }}
            className="mt-1 w-full accent-[var(--brand-pink)]"
          />
        </label>
      </div>
    </div>
  );
}

export function EssentialFiltersColumn() {
  return (
    <div className="flex flex-col gap-5">
      <GenderAgeBlock />
      <SizeBlock />
      <AvailabilityBlock />
      <PriceDualSlider stacked />
    </div>
  );
}

export function EssentialFiltersRow() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card/70 p-4">
      <GenderAgeBlock />
      <SizeBlock />
      <div className="grid gap-4 sm:grid-cols-2">
        <AvailabilityBlock />
        <PriceDualSlider />
      </div>
    </div>
  );
}
