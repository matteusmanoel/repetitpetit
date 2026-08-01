"use client";

import {
  AlertCircleIcon,
  BadgeCheckIcon,
  SparklesIcon,
  ThumbsUpIcon,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { BrandMultiSelect } from "@/features/catalog/components/BrandMultiSelect";
import {
  AGE_BANDS,
  AGE_BAND_LABELS,
  PRICE_RANGES,
  PRICE_RANGE_LABELS,
  PRODUCT_CONDITIONS,
  PRODUCT_CONDITION_DESCRIPTIONS,
  PRODUCT_CONDITION_LABELS,
  PRODUCT_GENDERS,
  PRODUCT_GENDER_LABELS,
  SIZE_CHIP_LABELS,
  SIZE_GROUPS,
  toggleInList,
  type AgeBand,
  type PriceRange,
  type ProductCondition,
  type ProductGender,
  type SizeGroup,
} from "@/features/catalog/filters";
import { useCatalogFilters } from "@/features/catalog/use-catalog-filters";
import { cn } from "@/lib/utils";

type CatalogFiltersProps = {
  brands: string[];
};

const CONDITION_ICONS: Record<ProductCondition, LucideIcon> = {
  novo: SparklesIcon,
  seminovo: BadgeCheckIcon,
  bom_estado: ThumbsUpIcon,
  com_detalhes: AlertCircleIcon,
};

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function ChipButton({
  pressed,
  onClick,
  children,
  title,
  className,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex h-11 min-h-11 shrink-0 items-center justify-center rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        pressed
          ? "border-primary bg-primary text-primary-foreground active:bg-primary/90"
          : "border-border bg-background text-foreground hover:bg-muted active:bg-muted/80",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function CatalogFilters({ brands }: CatalogFiltersProps) {
  const { filters, replaceFilters, isPending } = useCatalogFilters();

  function setTamanho(size: SizeGroup) {
    replaceFilters({
      ...filters,
      tamanho: toggleInList(filters.tamanho, size),
    });
  }

  function setGenero(gender: ProductGender) {
    replaceFilters({
      ...filters,
      genero: filters.genero === gender ? null : gender,
    });
  }

  function setFaixa(band: AgeBand) {
    replaceFilters({
      ...filters,
      faixa: filters.faixa === band ? null : band,
    });
  }

  function setConservacao(condition: ProductCondition) {
    replaceFilters({
      ...filters,
      conservacao: toggleInList(filters.conservacao, condition),
    });
  }

  function setPreco(range: PriceRange) {
    replaceFilters({
      ...filters,
      preco: filters.preco === range ? null : range,
    });
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-5 rounded-xl border border-border bg-card/60 p-4 sm:p-5",
        isPending && "opacity-90",
      )}
      aria-busy={isPending || undefined}
    >
      <FilterSection title="Tamanho">
        <div
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]"
          role="group"
          aria-label="Filtrar por tamanho"
        >
          {SIZE_GROUPS.map((size) => (
            <ChipButton
              key={size}
              pressed={filters.tamanho.includes(size)}
              onClick={() => setTamanho(size)}
              title={SIZE_CHIP_LABELS[size]}
            >
              {SIZE_CHIP_LABELS[size]}
            </ChipButton>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Gênero">
        <div
          className="flex gap-1 rounded-full bg-muted p-1"
          role="tablist"
          aria-label="Filtrar por gênero"
        >
          {PRODUCT_GENDERS.map((gender) => {
            const selected = filters.genero === gender;
            return (
              <button
                key={gender}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setGenero(gender)}
                className={cn(
                  "h-11 min-h-11 flex-1 rounded-full px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  selected
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground active:bg-background/60",
                )}
              >
                {PRODUCT_GENDER_LABELS[gender]}
              </button>
            );
          })}
        </div>
      </FilterSection>

      <FilterSection title="Faixa etária">
        <div
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]"
          role="group"
          aria-label="Filtrar por faixa etária"
        >
          {AGE_BANDS.map((band) => (
            <ChipButton
              key={band}
              pressed={filters.faixa === band}
              onClick={() => setFaixa(band)}
            >
              {AGE_BAND_LABELS[band]}
            </ChipButton>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Marca">
        <BrandMultiSelect
          brands={brands}
          selected={filters.marca}
          onChange={(marca) => replaceFilters({ ...filters, marca })}
          disabled={isPending}
        />
      </FilterSection>

      <FilterSection title="Conservação">
        <div
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]"
          role="group"
          aria-label="Filtrar por conservação"
        >
          {PRODUCT_CONDITIONS.map((condition) => {
            const Icon = CONDITION_ICONS[condition];
            const pressed = filters.conservacao.includes(condition);
            return (
              <ChipButton
                key={condition}
                pressed={pressed}
                onClick={() => setConservacao(condition)}
                title={PRODUCT_CONDITION_DESCRIPTIONS[condition]}
                className="gap-1.5"
              >
                <Icon className="size-3.5 shrink-0 opacity-80" aria-hidden />
                {PRODUCT_CONDITION_LABELS[condition]}
              </ChipButton>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Toque na pill para ver o significado da conservação.
        </p>
      </FilterSection>

      <FilterSection title="Preço">
        <div
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]"
          role="group"
          aria-label="Filtrar por preço"
        >
          {PRICE_RANGES.map((range) => (
            <ChipButton
              key={range}
              pressed={filters.preco === range}
              onClick={() => setPreco(range)}
            >
              {PRICE_RANGE_LABELS[range]}
            </ChipButton>
          ))}
        </div>
      </FilterSection>
    </div>
  );
}
