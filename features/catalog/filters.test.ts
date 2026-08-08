import { describe, expect, it } from "vitest";

import {
  EMPTY_CATALOG_FILTERS,
  catalogFiltersToQueryString,
  getActiveFilterChips,
  hasActiveCatalogFilters,
  parseCatalogFilters,
  resolveEffectiveSizeGroups,
  serializeCatalogFilters,
} from "./filters";

describe("parseCatalogFilters", () => {
  it("retorna filtros vazios sem params", () => {
    expect(parseCatalogFilters({})).toEqual(EMPTY_CATALOG_FILTERS);
  });

  it("interpreta CSV e ignora valores inválidos", () => {
    const filters = parseCatalogFilters({
      tamanho: "2_3a,xyz,4_5a,2_3a",
      genero: "menina",
      faixa: "baby",
      marca: "GAP,Zara",
      conservacao: "seminovo,foo",
      preco_max: "60",
    });

    expect(filters).toEqual({
      tamanho: ["2_3a", "4_5a"],
      genero: "menina",
      faixa: "baby",
      marca: ["GAP", "Zara"],
      conservacao: ["seminovo"],
      precoMax: 60,
      soDisponiveis: false,
    });
  });

  it("mapeia legado ?preco= chips para precoMax", () => {
    expect(parseCatalogFilters({ preco: "ate_30" }).precoMax).toBe(30);
    expect(parseCatalogFilters({ preco: "acima" }).precoMax).toBeNull();
  });

  it("aceita disponiveis=1 como Só disponíveis", () => {
    expect(parseCatalogFilters({ disponiveis: "1" }).soDisponiveis).toBe(true);
    expect(parseCatalogFilters({ disponiveis: "true" }).soDisponiveis).toBe(
      true,
    );
    expect(parseCatalogFilters({}).soDisponiveis).toBe(false);
  });

  it("aceita URLSearchParams", () => {
    const params = new URLSearchParams("tamanho=rn_3m&genero=unissex");
    expect(parseCatalogFilters(params)).toMatchObject({
      tamanho: ["rn_3m"],
      genero: "unissex",
    });
  });
});

describe("serializeCatalogFilters", () => {
  it("omite chaves vazias e round-trip com parse", () => {
    const filters = {
      tamanho: ["6_12m" as const],
      genero: "menino" as const,
      faixa: null,
      marca: ["Carter's"],
      conservacao: ["novo" as const],
      precoMax: 80,
      soDisponiveis: true,
    };

    const qs = catalogFiltersToQueryString(filters);
    expect(qs).toContain("tamanho=6_12m");
    expect(qs).toContain("genero=menino");
    expect(qs).not.toContain("faixa=");
    expect(qs).toContain("marca=Carter");
    expect(qs).toContain("preco_max=80");
    expect(qs).toContain("disponiveis=1");
    expect(parseCatalogFilters(serializeCatalogFilters(filters))).toEqual(
      filters,
    );
  });
});

describe("resolveEffectiveSizeGroups", () => {
  it("retorna null sem tamanho nem faixa", () => {
    expect(resolveEffectiveSizeGroups(EMPTY_CATALOG_FILTERS)).toBeNull();
  });

  it("intersecta tamanho e faixa", () => {
    expect(
      resolveEffectiveSizeGroups({
        ...EMPTY_CATALOG_FILTERS,
        tamanho: ["2_3a", "18_24m"],
        faixa: "baby",
      }),
    ).toEqual(["18_24m"]);
  });

  it("usa banda quando só faixa está ativa", () => {
    expect(
      resolveEffectiveSizeGroups({
        ...EMPTY_CATALOG_FILTERS,
        faixa: "kids",
      }),
    ).toEqual(["9_12a"]);
  });
});

describe("getActiveFilterChips / hasActiveCatalogFilters", () => {
  it("monta chips removíveis na ordem de prioridade", () => {
    const filters = {
      tamanho: ["rn_3m" as const],
      genero: "menina" as const,
      faixa: "baby" as const,
      marca: ["GAP"],
      conservacao: ["seminovo" as const],
      precoMax: 30,
      soDisponiveis: true,
    };

    expect(hasActiveCatalogFilters(filters)).toBe(true);

    const chips = getActiveFilterChips(filters);
    expect(chips.map((chip) => chip.id)).toEqual([
      "tamanho:rn_3m",
      "genero:menina",
      "faixa:baby",
      "marca:GAP",
      "conservacao:seminovo",
      "preco_max:30",
      "disponiveis:1",
    ]);

    const withoutGender = chips[1]!.remove(filters);
    expect(withoutGender.genero).toBeNull();
  });
});
