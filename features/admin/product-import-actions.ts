"use server";

import { revalidatePath } from "next/cache";

import {
  type ProductImportActionState,
} from "@/features/admin/product-import-state";
import { requireAdminSession } from "@/features/admin/session";
import {
  parseProductsXlsx,
  type ProductImportParsedRow,
  type ProductImportRowError,
} from "@/lib/imports/products-xlsx";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";
import type { Database, Json } from "@/lib/supabase/types";

type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

function toProductInsert(
  row: ProductImportParsedRow,
  categoryId: string | null,
): ProductInsert {
  return {
    name: row.nome,
    slug: row.resolvedSlug,
    description: row.descricao,
    price: row.preco,
    compare_at_price: row.preco_comparacao,
    brand: row.marca,
    size_label: row.tamanho,
    size_group: row.grupo_tamanho,
    gender: row.genero,
    condition: row.condicao,
    status: row.status,
    quantity: row.quantidade,
    is_featured: row.destaque,
    tags: row.tags.length > 0 ? row.tags : null,
    category_id: categoryId,
    cover_image_url: row.imagem_capa_url,
  };
}

async function resolveCategoryMap(
  slugs: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(slugs.filter(Boolean))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug")
    .in("slug", unique);

  if (error) {
    throw new Error(`Falha ao resolver categorias: ${error.message}`);
  }

  for (const row of data ?? []) {
    map.set(row.slug, row.id);
  }

  return map;
}

/**
 * Importa um lote de produtos a partir de um XLSX.
 * Sempre chama `requireAdminSession()` e grava via service role + `imports_log`.
 */
export async function importProductsXlsxAction(
  _prevState: ProductImportActionState,
  formData: FormData,
): Promise<ProductImportActionState> {
  await requireAdminSession();

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { error: "Selecione um arquivo XLSX para importar." };
  }

  const fileName = file.name?.trim() || "produtos.xlsx";
  if (!/\.xlsx$/i.test(fileName)) {
    return { error: "O arquivo precisa ser .xlsx (Excel)." };
  }

  if (file.size <= 0) {
    return { error: "O arquivo está vazio." };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: "O arquivo ultrapassa o limite de 5 MB." };
  }

  const supabase = createServiceSupabaseClient();
  const startedAt = new Date().toISOString();

  const { data: logRow, error: logInsertError } = await supabase
    .from("imports_log")
    .insert({
      file_name: fileName,
      import_type: "products_xlsx",
      status: "processing",
      started_at: startedAt,
    })
    .select("id")
    .single();

  if (logInsertError || !logRow) {
    return {
      error: `Não foi possível iniciar o log de importação: ${logInsertError?.message ?? "erro desconhecido"}`,
    };
  }

  const importId = logRow.id;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = parseProductsXlsx(buffer);
    const errors: ProductImportRowError[] = [...parsed.errors];
    let importedRows = 0;

    const categorySlugs = parsed.rows
      .map((row) => row.categoria_slug)
      .filter((slug): slug is string => Boolean(slug));
    const categoryMap = await resolveCategoryMap(categorySlugs);

    // Deduplica slugs dentro do próprio arquivo (segundo+ falha)
    const seenSlugs = new Set<string>();

    for (const row of parsed.rows) {
      if (seenSlugs.has(row.resolvedSlug)) {
        errors.push({
          row: row.sheetRow,
          message: `Slug duplicado na planilha: ${row.resolvedSlug}`,
        });
        continue;
      }
      seenSlugs.add(row.resolvedSlug);

      let categoryId: string | null = null;
      if (row.categoria_slug) {
        categoryId = categoryMap.get(row.categoria_slug) ?? null;
        if (!categoryId) {
          errors.push({
            row: row.sheetRow,
            message: `categoria_slug não encontrada: ${row.categoria_slug}`,
          });
          continue;
        }
      }

      const insert = toProductInsert(row, categoryId);
      const { data: created, error: insertError } = await supabase
        .from("products")
        .insert(insert)
        .select("id")
        .maybeSingle();

      if (insertError) {
        const message =
          insertError.code === "23505"
            ? `Já existe um produto com o slug "${row.resolvedSlug}".`
            : insertError.message;
        errors.push({ row: row.sheetRow, message });
        continue;
      }

      if (!created) {
        errors.push({
          row: row.sheetRow,
          message: "Insert não retornou o produto criado.",
        });
        continue;
      }

      importedRows += 1;
    }

    const failedRows = errors.length;
    const totalRows = parsed.totalRows;
    const finishedAt = new Date().toISOString();
    const status =
      importedRows === 0 && failedRows > 0
        ? "failed"
        : failedRows > 0
          ? "partial"
          : "completed";

    const errorReport: Json = errors.map((item) => ({
      row: item.row,
      message: item.message,
    }));

    const { error: logUpdateError } = await supabase
      .from("imports_log")
      .update({
        status,
        total_rows: totalRows,
        imported_rows: importedRows,
        failed_rows: failedRows,
        error_report_json: errorReport,
        finished_at: finishedAt,
      })
      .eq("id", importId);

    if (logUpdateError) {
      return {
        error: `Produtos processados, mas o log falhou: ${logUpdateError.message}`,
      };
    }

    revalidatePath("/admin/produtos");
    revalidatePath("/catalogo");

    return {
      summary: {
        importId,
        fileName,
        totalRows,
        importedRows,
        failedRows,
        errors,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha inesperada na importação.";

    await supabase
      .from("imports_log")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        error_report_json: [{ row: 0, message }],
      })
      .eq("id", importId);

    return { error: message };
  }
}
