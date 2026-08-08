import type { Database } from "@/lib/supabase/types";

export type SizeGroup = Database["public"]["Enums"]["size_group"];
export type ProductGender = Database["public"]["Enums"]["product_gender"];
export type ProductCondition = Database["public"]["Enums"]["product_condition"];

/** Faixas etárias agrupadas a partir de `size_group` (docs/05-ux-direction). */
export type AgeBand = "baby" | "crianca" | "kids";

/**
 * @deprecated D132 — chips de faixa; mantido só para mapear bookmarks `?preco=`.
 */
export type PriceRange = "ate_30" | "30_60" | "60_100" | "acima";

export type CatalogFilters = {
  /** Multi-select de `size_group`. */
  tamanho: SizeGroup[];
  /** Tab de gênero — no máximo um valor. */
  genero: ProductGender | null;
  /** Faixa etária agrupada. */
  faixa: AgeBand | null;
  /** Marcas (texto livre do DB). */
  marca: string[];
  /** Conservação / condição. */
  conservacao: ProductCondition[];
  /**
   * Teto de preço inclusivo (`price <= precoMax`). `null` = sem filtro.
   * D132 Option A — slider máximo, min implícito 0.
   */
  precoMax: number | null;
  /**
   * Quando true, só peças `available` (esconde Reservada).
   * Padrão false = available + hold (#97).
   */
  soDisponiveis: boolean;
};

export const EMPTY_CATALOG_FILTERS: CatalogFilters = {
  tamanho: [],
  genero: null,
  faixa: null,
  marca: [],
  conservacao: [],
  precoMax: null,
  soDisponiveis: false,
};

/** Teto do slider na UI; valor == ceiling → sem filtro (`precoMax` null). */
export const PRICE_SLIDER_CEILING = 300;

export const SIZE_GROUPS = [
  "rn_3m",
  "3_6m",
  "6_12m",
  "12_18m",
  "18_24m",
  "2_3a",
  "4_5a",
  "6_8a",
  "9_12a",
  "13_mais",
] as const satisfies readonly SizeGroup[];

/** Rótulos curtos para chips de tamanho (size_group → size_label amigável). */
export const SIZE_CHIP_LABELS: Record<SizeGroup, string> = {
  rn_3m: "RN",
  "3_6m": "3–6m",
  "6_12m": "6–12m",
  "12_18m": "12–18m",
  "18_24m": "18–24m",
  "2_3a": "2–3a",
  "4_5a": "4–5a",
  "6_8a": "6–8a",
  "9_12a": "9–12a",
  "13_mais": "13+",
};

export const PRODUCT_GENDERS = [
  "menino",
  "menina",
  "unissex",
] as const satisfies readonly ProductGender[];

export const PRODUCT_GENDER_LABELS: Record<ProductGender, string> = {
  menino: "Menino",
  menina: "Menina",
  unissex: "Unissex",
};

export const AGE_BANDS = ["baby", "crianca", "kids"] as const satisfies readonly AgeBand[];

export const AGE_BAND_LABELS: Record<AgeBand, string> = {
  baby: "Baby (RN–24m)",
  crianca: "Criança (2–8a)",
  kids: "Kids+ (9–12a)",
};

export const AGE_BAND_SIZE_GROUPS: Record<AgeBand, readonly SizeGroup[]> = {
  baby: ["rn_3m", "3_6m", "6_12m", "12_18m", "18_24m"],
  crianca: ["2_3a", "4_5a", "6_8a"],
  kids: ["9_12a"],
};

export const PRODUCT_CONDITIONS = [
  "novo",
  "seminovo",
  "bom_estado",
  "com_detalhes",
] as const satisfies readonly ProductCondition[];

export const PRODUCT_CONDITION_LABELS: Record<ProductCondition, string> = {
  novo: "Novo",
  seminovo: "Seminovo",
  bom_estado: "Bom estado",
  com_detalhes: "Com detalhes",
};

/** Descrição curta para hover/tap nas pills de conservação. */
export const PRODUCT_CONDITION_DESCRIPTIONS: Record<ProductCondition, string> = {
  novo: "Com etiqueta, nunca usado",
  seminovo: "Usado poucas vezes, sem marcas",
  bom_estado: "Usado com pequenas marcas aceitáveis",
  com_detalhes: "Marcas visíveis, descritas na peça",
};

/** @deprecated D132 — só legado `?preco=` */
export const PRICE_RANGES = [
  "ate_30",
  "30_60",
  "60_100",
  "acima",
] as const satisfies readonly PriceRange[];

/** @deprecated D132 */
export const PRICE_RANGE_LABELS: Record<PriceRange, string> = {
  ate_30: "Até R$30",
  "30_60": "R$30–60",
  "60_100": "R$60–100",
  acima: "Acima de R$100",
};

/** Map bookmarks `?preco=` → teto inclusivo (faixas com overlap resolvido pelo max). */
const LEGACY_PRICE_TO_MAX: Record<PriceRange, number | null> = {
  ate_30: 30,
  "30_60": 60,
  "60_100": 100,
  acima: null,
};

const SIZE_GROUP_SET = new Set<string>(SIZE_GROUPS);
const GENDER_SET = new Set<string>(PRODUCT_GENDERS);
const AGE_BAND_SET = new Set<string>(AGE_BANDS);
const CONDITION_SET = new Set<string>(PRODUCT_CONDITIONS);
const PRICE_RANGE_SET = new Set<string>(PRICE_RANGES);

function splitCsv(raw: string | string[] | undefined): string[] {
  if (raw == null) return [];
  const value = Array.isArray(raw) ? raw.join(",") : raw;
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function uniquePreserveOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

function parsePrecoMax(raw: string | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(Math.round(n * 100) / 100, PRICE_SLIDER_CEILING);
}

/**
 * Interpreta query params da URL do catálogo.
 * Valores inválidos são ignorados (não quebram a página).
 */
export function parseCatalogFilters(
  params: Record<string, string | string[] | undefined> | URLSearchParams,
): CatalogFilters {
  const get = (key: string): string | string[] | undefined => {
    if (params instanceof URLSearchParams) {
      const all = params.getAll(key);
      if (all.length === 0) return undefined;
      if (all.length === 1) return all[0];
      return all;
    }
    return params[key];
  };

  const tamanho = uniquePreserveOrder(splitCsv(get("tamanho"))).filter(
    (value): value is SizeGroup => SIZE_GROUP_SET.has(value),
  );

  const generoRaw = splitCsv(get("genero"))[0] ?? null;
  const genero =
    generoRaw && GENDER_SET.has(generoRaw)
      ? (generoRaw as ProductGender)
      : null;

  const faixaRaw = splitCsv(get("faixa"))[0] ?? null;
  const faixa =
    faixaRaw && AGE_BAND_SET.has(faixaRaw) ? (faixaRaw as AgeBand) : null;

  const marca = uniquePreserveOrder(splitCsv(get("marca")));

  const conservacao = uniquePreserveOrder(splitCsv(get("conservacao"))).filter(
    (value): value is ProductCondition => CONDITION_SET.has(value),
  );

  let precoMax = parsePrecoMax(splitCsv(get("preco_max"))[0]);

  // Legado D57 chips `?preco=` → teto (D132 expand-contract).
  if (precoMax == null) {
    const precoRaw = splitCsv(get("preco"))[0] ?? null;
    if (precoRaw && PRICE_RANGE_SET.has(precoRaw)) {
      precoMax = LEGACY_PRICE_TO_MAX[precoRaw as PriceRange];
    }
  }

  const disponiveisRaw = (splitCsv(get("disponiveis"))[0] ?? "").toLowerCase();
  const soDisponiveis =
    disponiveisRaw === "1" ||
    disponiveisRaw === "true" ||
    disponiveisRaw === "sim";

  return { tamanho, genero, faixa, marca, conservacao, precoMax, soDisponiveis };
}

/** Serializa filtros para URLSearchParams (omite vazios). */
export function serializeCatalogFilters(
  filters: CatalogFilters,
): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.tamanho.length > 0) {
    params.set("tamanho", filters.tamanho.join(","));
  }
  if (filters.genero) {
    params.set("genero", filters.genero);
  }
  if (filters.faixa) {
    params.set("faixa", filters.faixa);
  }
  if (filters.marca.length > 0) {
    params.set("marca", filters.marca.join(","));
  }
  if (filters.conservacao.length > 0) {
    params.set("conservacao", filters.conservacao.join(","));
  }
  if (filters.precoMax != null && filters.precoMax < PRICE_SLIDER_CEILING) {
    params.set("preco_max", String(filters.precoMax));
  }
  if (filters.soDisponiveis) {
    params.set("disponiveis", "1");
  }

  return params;
}

export function catalogFiltersToQueryString(filters: CatalogFilters): string {
  return serializeCatalogFilters(filters).toString();
}

export function hasActiveCatalogFilters(filters: CatalogFilters): boolean {
  return (
    filters.tamanho.length > 0 ||
    filters.genero != null ||
    filters.faixa != null ||
    filters.marca.length > 0 ||
    filters.conservacao.length > 0 ||
    (filters.precoMax != null && filters.precoMax < PRICE_SLIDER_CEILING) ||
    filters.soDisponiveis
  );
}

/**
 * Resolve o conjunto efetivo de `size_group` para a query.
 * `tamanho` e `faixa` se intersectam quando ambos estão ativos.
 */
export function resolveEffectiveSizeGroups(
  filters: CatalogFilters,
): SizeGroup[] | null {
  const fromTamanho = filters.tamanho;
  const fromFaixa = filters.faixa
    ? [...AGE_BAND_SIZE_GROUPS[filters.faixa]]
    : null;

  if (fromTamanho.length === 0 && fromFaixa == null) {
    return null;
  }

  if (fromTamanho.length > 0 && fromFaixa != null) {
    const band = new Set(fromFaixa);
    return fromTamanho.filter((group) => band.has(group));
  }

  if (fromTamanho.length > 0) {
    return fromTamanho;
  }

  return fromFaixa;
}

export type ActiveFilterChip = {
  id: string;
  label: string;
  /** Remove este chip do estado de filtros. */
  remove: (filters: CatalogFilters) => CatalogFilters;
};

/** Chips removíveis acima do grid, na ordem de prioridade dos filtros. */
export function getActiveFilterChips(
  filters: CatalogFilters,
): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];

  for (const size of filters.tamanho) {
    chips.push({
      id: `tamanho:${size}`,
      label: `Tamanho: ${SIZE_CHIP_LABELS[size]}`,
      remove: (current) => ({
        ...current,
        tamanho: current.tamanho.filter((value) => value !== size),
      }),
    });
  }

  if (filters.genero) {
    const gender = filters.genero;
    chips.push({
      id: `genero:${gender}`,
      label: `Sexo: ${PRODUCT_GENDER_LABELS[gender]}`,
      remove: (current) => ({ ...current, genero: null }),
    });
  }

  if (filters.faixa) {
    const band = filters.faixa;
    chips.push({
      id: `faixa:${band}`,
      label: AGE_BAND_LABELS[band],
      remove: (current) => ({ ...current, faixa: null }),
    });
  }

  for (const brand of filters.marca) {
    chips.push({
      id: `marca:${brand}`,
      label: `Marca: ${brand}`,
      remove: (current) => ({
        ...current,
        marca: current.marca.filter((value) => value !== brand),
      }),
    });
  }

  for (const condition of filters.conservacao) {
    chips.push({
      id: `conservacao:${condition}`,
      label: PRODUCT_CONDITION_LABELS[condition],
      remove: (current) => ({
        ...current,
        conservacao: current.conservacao.filter((value) => value !== condition),
      }),
    });
  }

  if (filters.precoMax != null && filters.precoMax < PRICE_SLIDER_CEILING) {
    const max = filters.precoMax;
    chips.push({
      id: `preco_max:${max}`,
      label: `Até R$${max}`,
      remove: (current) => ({ ...current, precoMax: null }),
    });
  }

  if (filters.soDisponiveis) {
    chips.push({
      id: "disponiveis:1",
      label: "Só disponíveis",
      remove: (current) => ({ ...current, soDisponiveis: false }),
    });
  }

  return chips;
}

export function toggleInList<T extends string>(
  list: T[],
  value: T,
): T[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}
