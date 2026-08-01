import * as XLSX from "xlsx";
import { z } from "zod";

import {
  PRODUCT_CONDITIONS,
  PRODUCT_GENDERS,
  PRODUCT_STATUSES,
  SIZE_GROUPS,
  slugifyProductName,
} from "@/features/admin/product-constants";

/** Cabeçalhos canônicos do template (PT-BR) e aliases aceitos (EN / data-model). */
const HEADER_ALIASES: Record<string, string> = {
  nome: "nome",
  name: "nome",
  slug: "slug",
  descricao: "descricao",
  description: "descricao",
  preco: "preco",
  price: "preco",
  preco_comparacao: "preco_comparacao",
  compare_at_price: "preco_comparacao",
  marca: "marca",
  brand: "marca",
  tamanho: "tamanho",
  size_label: "tamanho",
  size: "tamanho",
  grupo_tamanho: "grupo_tamanho",
  size_group: "grupo_tamanho",
  genero: "genero",
  gender: "genero",
  condicao: "condicao",
  condition: "condicao",
  status: "status",
  quantidade: "quantidade",
  quantity: "quantidade",
  destaque: "destaque",
  is_featured: "destaque",
  tags: "tags",
  categoria_slug: "categoria_slug",
  category_slug: "categoria_slug",
  imagem_capa_url: "imagem_capa_url",
  cover_image_url: "imagem_capa_url",
};

export const PRODUCT_XLSX_HEADERS = [
  "nome",
  "slug",
  "descricao",
  "preco",
  "preco_comparacao",
  "marca",
  "tamanho",
  "grupo_tamanho",
  "genero",
  "condicao",
  "status",
  "quantidade",
  "destaque",
  "tags",
  "categoria_slug",
  "imagem_capa_url",
] as const;

export type ProductXlsxHeader = (typeof PRODUCT_XLSX_HEADERS)[number];

const emptyToNull = (value: unknown) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
};

function normalizeHeader(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s/]+/g, "_")
    .replace(/_+/g, "_");
}

function coerceBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return ["true", "1", "sim", "yes", "s", "x"].includes(normalized);
}

/** Aceita "49,90", "R$ 49.90" ou número do Excel. */
function coercePrice(value: unknown): unknown {
  if (value === null || value === undefined || value === "") return value;
  if (typeof value === "number") return value;
  if (typeof value !== "string") return value;

  const cleaned = value
    .trim()
    .replace(/R\$\s?/gi, "")
    .replace(/\s/g, "");

  if (cleaned.includes(",") && cleaned.includes(".")) {
    // 1.234,56
    return Number(cleaned.replace(/\./g, "").replace(",", "."));
  }

  if (cleaned.includes(",")) {
    return Number(cleaned.replace(",", "."));
  }

  return Number(cleaned);
}

function coerceTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : String(item).trim()))
      .filter(Boolean);
  }
  if (value === null || value === undefined) return [];
  if (typeof value !== "string") return [];
  if (!value.trim()) return [];
  return value
    .split(/[,;|]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normalizeEnumToken(value: unknown): unknown {
  if (typeof value !== "string") return value;
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

const productImportRowSchema = z.object({
  nome: z
    .string({ error: "Informe o nome da peça." })
    .trim()
    .min(2, "O nome precisa ter pelo menos 2 caracteres.")
    .max(160, "O nome pode ter no máximo 160 caracteres."),
  slug: z.preprocess((value) => {
    if (typeof value === "string" && value.trim() !== "") {
      return slugifyProductName(value);
    }
    return null;
  }, z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .nullable()),
  descricao: z.preprocess(emptyToNull, z.string().max(5000).nullable()),
  preco: z.preprocess(
    coercePrice,
    z.coerce.number({ error: "Informe o preço." }).positive("O preço deve ser maior que zero."),
  ),
  preco_comparacao: z.preprocess(
    (value) => emptyToNull(coercePrice(value)),
    z.coerce.number().positive().nullable(),
  ),
  marca: z.preprocess(emptyToNull, z.string().max(80).nullable()),
  tamanho: z
    .string({ error: "Informe o tamanho (ex.: 2 anos, P, 12-18m)." })
    .trim()
    .min(1, "Informe o tamanho.")
    .max(40, "O tamanho pode ter no máximo 40 caracteres."),
  grupo_tamanho: z.preprocess(
    normalizeEnumToken,
    z.enum(SIZE_GROUPS, {
      error: `grupo_tamanho inválido. Use: ${SIZE_GROUPS.join(", ")}.`,
    }),
  ),
  genero: z.preprocess(
    (value) => {
      const token = normalizeEnumToken(value);
      if (token === null || token === undefined || token === "") return "unissex";
      return token;
    },
    z.enum(PRODUCT_GENDERS, {
      error: `genero inválido. Use: ${PRODUCT_GENDERS.join(", ")}.`,
    }),
  ),
  condicao: z.preprocess(
    (value) => {
      const token = normalizeEnumToken(value);
      if (token === null || token === undefined || token === "") return "seminovo";
      return token;
    },
    z.enum(PRODUCT_CONDITIONS, {
      error: `condicao inválida. Use: ${PRODUCT_CONDITIONS.join(", ")}.`,
    }),
  ),
  status: z.preprocess(
    (value) => {
      const token = normalizeEnumToken(value);
      if (token === null || token === undefined || token === "") return "available";
      return token;
    },
    z.enum(PRODUCT_STATUSES, {
      error: `status inválido. Use: ${PRODUCT_STATUSES.join(", ")}.`,
    }),
  ),
  quantidade: z.preprocess((value) => {
    if (value === null || value === undefined || value === "") return 1;
    return value;
  }, z.coerce.number().int().min(0).max(1).default(1)),
  destaque: z.preprocess((value) => {
    if (value === null || value === undefined || value === "") return false;
    return coerceBoolean(value);
  }, z.boolean()),
  tags: z.preprocess(coerceTags, z.array(z.string().min(1)).default([])),
  categoria_slug: z.preprocess(emptyToNull, z.string().max(120).nullable()),
  imagem_capa_url: z.preprocess(
    emptyToNull,
    z.string().url("imagem_capa_url inválida.").nullable(),
  ),
});

export type ProductImportRow = z.infer<typeof productImportRowSchema>;

export type ProductImportParsedRow = ProductImportRow & {
  /** Número da linha na planilha (1 = cabeçalho; dados começam em 2). */
  sheetRow: number;
  /** Slug final (gerado a partir do nome quando a coluna vem vazia). */
  resolvedSlug: string;
};

export type ProductImportRowError = {
  row: number;
  message: string;
  raw?: Record<string, unknown>;
};

export type ParseProductsXlsxResult = {
  rows: ProductImportParsedRow[];
  errors: ProductImportRowError[];
  totalRows: number;
};

function rowToCanonical(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(raw)) {
    const normalized = normalizeHeader(String(key));
    const canonical = HEADER_ALIASES[normalized];
    if (!canonical) continue;
    // Prefer first non-empty value if duplicate aliases appear
    if (out[canonical] === undefined || out[canonical] === "" || out[canonical] === null) {
      out[canonical] = value;
    }
  }

  return out;
}

function formatZodIssues(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join("; ");
}

/**
 * Parser Zod+XLSX do acervo (padrão Flor / reuse-map, schema do brechó).
 * Aceita buffer/ArrayBuffer/Uint8Array de um .xlsx com a primeira aba.
 */
export function parseProductsXlsx(
  input: ArrayBuffer | Uint8Array | Buffer,
): ParseProductsXlsxResult {
  const readType =
    typeof Buffer !== "undefined" && Buffer.isBuffer(input) ? "buffer" : "array";
  const workbook = XLSX.read(input, { type: readType, cellDates: true });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    return {
      rows: [],
      errors: [{ row: 0, message: "A planilha está vazia (nenhuma aba encontrada)." }],
      totalRows: 0,
    };
  }

  const sheet = workbook.Sheets[sheetName];
  const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  const rows: ProductImportParsedRow[] = [];
  const errors: ProductImportRowError[] = [];

  jsonRows.forEach((raw, index) => {
    const sheetRow = index + 2; // cabeçalho = linha 1
    const canonical = rowToCanonical(raw);

    const hasAnyValue = Object.values(canonical).some((value) => {
      if (value === null || value === undefined) return false;
      if (typeof value === "string") return value.trim() !== "";
      return true;
    });

    if (!hasAnyValue) return;

    const parsed = productImportRowSchema.safeParse(canonical);
    if (!parsed.success) {
      errors.push({
        row: sheetRow,
        message: formatZodIssues(parsed.error),
        raw: canonical,
      });
      return;
    }

    const data = parsed.data;
    const resolvedSlug = data.slug ?? slugifyProductName(data.nome);

    if (!resolvedSlug) {
      errors.push({
        row: sheetRow,
        message: "Não foi possível gerar um slug a partir do nome.",
        raw: canonical,
      });
      return;
    }

    rows.push({
      ...data,
      slug: data.slug,
      sheetRow,
      resolvedSlug,
    });
  });

  return {
    rows,
    errors,
    totalRows: rows.length + errors.length,
  };
}

/** Converte o retorno de `XLSX.write({ type: "array" })` em ArrayBuffer. */
export function xlsxArrayToArrayBuffer(data: ArrayBuffer | Uint8Array | number[]): ArrayBuffer {
  if (data instanceof ArrayBuffer) return data;
  if (ArrayBuffer.isView(data)) {
    return data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength,
    ) as ArrayBuffer;
  }
  return Uint8Array.from(data).buffer;
}

/** Gera um ArrayBuffer de template XLSX (cabeçalho + 1 linha de exemplo). */
export function buildProductsXlsxTemplate(): ArrayBuffer {
  const example = {
    nome: "Casaco Moletom GAP",
    slug: "casaco-moletom-gap",
    descricao: "Moletom azul, sem pelinhos, ótimo estado.",
    preco: 49.9,
    preco_comparacao: 89.9,
    marca: "GAP",
    tamanho: "2 anos",
    grupo_tamanho: "2_3a",
    genero: "unissex",
    condicao: "seminovo",
    status: "available",
    quantidade: 1,
    destaque: "nao",
    tags: "inverno, casaco",
    categoria_slug: "casacos-e-moletons",
    imagem_capa_url: "https://placehold.co/400x533/F4F4F0/1A1A1A?text=Repeti+Petit",
  };

  const worksheet = XLSX.utils.json_to_sheet([example], {
    header: [...PRODUCT_XLSX_HEADERS],
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "produtos");
  const written = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as
    | number[]
    | Uint8Array;
  return xlsxArrayToArrayBuffer(written);
}

export { productImportRowSchema };
