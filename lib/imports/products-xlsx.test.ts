import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import {
  PRODUCT_XLSX_HEADERS,
  buildProductsXlsxTemplate,
  parseProductsXlsx,
  xlsxArrayToArrayBuffer,
} from "@/lib/imports/products-xlsx";

function workbookFromRows(rows: Record<string, unknown>[]): ArrayBuffer {
  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: [...PRODUCT_XLSX_HEADERS],
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "produtos");
  const written = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as
    | number[]
    | Uint8Array;
  return xlsxArrayToArrayBuffer(written);
}

describe("parseProductsXlsx", () => {
  it("valida linha válida com enums do brechó", () => {
    const buffer = workbookFromRows([
      {
        nome: "Casaco Moletom GAP",
        slug: "",
        descricao: "Azul",
        preco: "49,90",
        preco_comparacao: "",
        marca: "GAP",
        tamanho: "M",
        grupo_tamanho: "2_3a",
        genero: "unissex",
        condicao: "seminovo",
        status: "available",
        quantidade: 1,
        destaque: "sim",
        tags: "inverno, casaco",
        categoria_slug: "casacos-e-moletons",
        imagem_capa_url: "https://placehold.co/400x533",
      },
    ]);

    const result = parseProductsXlsx(buffer);
    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.preco).toBeCloseTo(49.9);
    expect(result.rows[0]?.resolvedSlug).toBe("casaco-moletom-gap");
    expect(result.rows[0]?.destaque).toBe(true);
    expect(result.rows[0]?.tags).toEqual(["inverno", "casaco"]);
    expect(result.rows[0]?.grupo_tamanho).toBe("2_3a");
  });

  it("aceita aliases em inglês (name/brand/size_group)", () => {
    const worksheet = XLSX.utils.json_to_sheet([
      {
        name: "Body floral",
        brand: "Carter's",
        size_label: "M",
        size_group: "6_12m",
        gender: "menina",
        condition: "novo",
        price: 29.9,
      },
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "produtos");
    const written = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as
      | number[]
      | Uint8Array;

    const result = parseProductsXlsx(xlsxArrayToArrayBuffer(written));
    expect(result.errors).toHaveLength(0);
    expect(result.rows[0]?.nome).toBe("Body floral");
    expect(result.rows[0]?.marca).toBe("Carter's");
    expect(result.rows[0]?.genero).toBe("menina");
  });

  it("acumula erros de enum inválido sem abortar o lote", () => {
    const buffer = workbookFromRows([
      {
        nome: "Peça boa",
        preco: 10,
        tamanho: "P",
        grupo_tamanho: "2_3a",
        genero: "unissex",
        condicao: "seminovo",
      },
      {
        nome: "Peça ruim",
        preco: 10,
        tamanho: "P",
        grupo_tamanho: "gigante",
        genero: "alien",
        condicao: "quebrado",
      },
    ]);

    const result = parseProductsXlsx(buffer);
    expect(result.rows).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.row).toBe(3);
    expect(result.errors[0]?.message).toMatch(/grupo_tamanho|genero|condicao/i);
    expect(result.totalRows).toBe(2);
  });

  it("buildProductsXlsxTemplate gera planilha parseável", () => {
    const template = buildProductsXlsxTemplate();
    const result = parseProductsXlsx(template);
    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.nome).toContain("GAP");
  });
});
