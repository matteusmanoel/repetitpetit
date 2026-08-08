"use client";

import {
  AlertCircleIcon,
  BadgeCheckIcon,
  SparklesIcon,
  ThumbsUpIcon,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
import { CONDITION_PILL_CLASS, GENDER_TOGGLE_ACTIVE_CLASS } from "@/features/catalog/ui-tokens";
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

/**
 * Pill de conservação sempre colorida (mesmos tokens do `ProductCard`) — o
 * estado ativo é sinalizado por um ring, não por trocar a cor de fundo, para
 * a pill continuar comunicando a condição mesmo antes de ser tocada.
 */
function ConditionChip({
  condition,
  pressed,
  onClick,
}: {
  condition: ProductCondition;
  pressed: boolean;
  onClick: () => void;
}) {
  const Icon = CONDITION_ICONS[condition];

  return (
    <button
      type="button"
      title={PRODUCT_CONDITION_DESCRIPTIONS[condition]}
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex h-11 min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        CONDITION_PILL_CLASS[condition],
        pressed
          ? "ring-2 ring-current ring-offset-2 ring-offset-background"
          : "opacity-70 hover:opacity-100 active:opacity-90",
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {PRODUCT_CONDITION_LABELS[condition]}
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

  function setGenero(gender: ProductGender | null) {
    replaceFilters({
      ...filters,
      genero: gender,
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
        "flex flex-col gap-5 rounded-2xl border border-border bg-card/60 p-4 sm:p-5",
        isPending && "opacity-90",
      )}
      aria-busy={isPending || undefined}
    >
      <FilterSection title="Disponibilidade">
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/60 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
          <input
            type="checkbox"
            className="size-5 shrink-0 rounded border-border accent-primary"
            checked={filters.soDisponiveis}
            onChange={() =>
              replaceFilters({
                ...filters,
                soDisponiveis: !filters.soDisponiveis,
              })
            }
          />
          <span>Só disponíveis</span>
        </label>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Por padrão o catálogo também mostra peças reservadas.
        </p>
      </FilterSection>

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

      <FilterSection title="Sexo e idade">
        <ToggleGroup
          type="single"
          value={filters.genero ?? ""}
          onValueChange={(value) =>
            setGenero((value || null) as ProductGender | null)
          }
          className="w-full gap-1 rounded-full bg-muted p-1"
          aria-label="Filtrar por sexo"
        >
          {PRODUCT_GENDERS.map((gender) => (
            <ToggleGroupItem
              key={gender}
              value={gender}
              className={cn(
                "h-11 min-h-11 flex-1 rounded-full border-0 text-sm font-semibold text-muted-foreground transition-colors hover:bg-transparent hover:text-foreground data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm",
                GENDER_TOGGLE_ACTIVE_CLASS[gender],
              )}
            >
              {PRODUCT_GENDER_LABELS[gender]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {filters.genero || filters.faixa ? (
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
        ) : (
          <p className="text-xs text-muted-foreground sm:text-sm">
            Escolha Meninas, Meninos ou Unissex para ver as faixas de idade.
          </p>
        )}
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
          {PRODUCT_CONDITIONS.map((condition) => (
            <ConditionChip
              key={condition}
              condition={condition}
              pressed={filters.conservacao.includes(condition)}
              onClick={() => setConservacao(condition)}
            />
          ))}
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
