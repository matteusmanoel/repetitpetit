/**
 * Verificação live da T12 contra o projeto Supabase real:
 * 1) monta um XLSX pequeno (2 ok + 1 inválida) com o parser do app
 * 2) simula o fluxo da server action (imports_log + inserts)
 * 3) confirma produtos no service role e visibilidade anon (/catalogo)
 * 4) limpa as peças de teste
 *
 * Uso: pnpm exec tsx --env-file=.env.local scripts/verify-xlsx-import.mjs
 */
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

import { parseProductsXlsx } from "../lib/imports/products-xlsx.ts";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey || !anonKey) {
  console.error("Missing Supabase env vars.");
  process.exit(1);
}

const service = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const anon = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const stamp = Date.now();
const slugOk1 = `t12-import-ok-a-${stamp}`;
const slugOk2 = `t12-import-ok-b-${stamp}`;

function buildFixtureBuffer() {
  const rows = [
    {
      nome: `Peça T12 OK A ${stamp}`,
      slug: slugOk1,
      descricao: "Fixture E2E T12 — linha válida A",
      preco: 19.9,
      preco_comparacao: 29.9,
      marca: "T12Brand",
      tamanho: "2 anos",
      grupo_tamanho: "2_3a",
      genero: "unissex",
      condicao: "seminovo",
      status: "available",
      quantidade: 1,
      destaque: "nao",
      tags: "t12,teste",
      categoria_slug: "casacos-e-moletons",
      imagem_capa_url: "https://placehold.co/400x533/F4F4F0/1A1A1A?text=T12+A",
    },
    {
      nome: `Peça T12 OK B ${stamp}`,
      slug: slugOk2,
      descricao: "Fixture E2E T12 — linha válida B",
      preco: "34,50",
      marca: "T12Brand",
      tamanho: "6-12m",
      grupo_tamanho: "6_12m",
      genero: "menina",
      condicao: "novo",
      status: "available",
      quantidade: 1,
      tags: "t12",
      categoria_slug: "blusas-e-camisetas",
      imagem_capa_url: "https://placehold.co/400x533/F4F4F0/1A1A1A?text=T12+B",
    },
    {
      nome: `Peça T12 FAIL ${stamp}`,
      slug: `t12-import-fail-${stamp}`,
      preco: 10,
      tamanho: "P",
      grupo_tamanho: "tamanho_invalido",
      genero: "unissex",
      condicao: "seminovo",
      status: "available",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "produtos");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

async function main() {
  const buffer = buildFixtureBuffer();
  const parsed = parseProductsXlsx(buffer);

  console.log("parsed", {
    totalRows: parsed.totalRows,
    ok: parsed.rows.length,
    errors: parsed.errors.length,
    errorMessages: parsed.errors.map((e) => e.message),
  });

  if (parsed.rows.length !== 2 || parsed.errors.length !== 1) {
    throw new Error(
      `Expected 2 ok + 1 error, got ${parsed.rows.length} ok / ${parsed.errors.length} errors`,
    );
  }

  const startedAt = new Date().toISOString();
  const { data: logRow, error: logError } = await service
    .from("imports_log")
    .insert({
      file_name: `t12-fixture-${stamp}.xlsx`,
      import_type: "products_xlsx",
      status: "processing",
      started_at: startedAt,
    })
    .select("id")
    .single();
  if (logError) throw logError;
  console.log("imports_log started", logRow.id);

  const { data: categories, error: catError } = await service
    .from("categories")
    .select("id, slug")
    .in("slug", ["casacos-e-moletons", "blusas-e-camisetas"]);
  if (catError) throw catError;
  const catMap = new Map((categories ?? []).map((c) => [c.slug, c.id]));

  if (catMap.size < 2) {
    throw new Error(
      "Seed categories missing (casacos-e-moletons / blusas-e-camisetas). Apply seed.sql first.",
    );
  }

  const createdIds = [];
  const rowErrors = [...parsed.errors];

  for (const row of parsed.rows) {
    const categoryId = row.categoria_slug
      ? (catMap.get(row.categoria_slug) ?? null)
      : null;
    if (row.categoria_slug && !categoryId) {
      rowErrors.push({
        row: row.sheetRow,
        message: `categoria_slug não encontrada: ${row.categoria_slug}`,
      });
      continue;
    }

    const { data: created, error: insertError } = await service
      .from("products")
      .insert({
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
      })
      .select("id, slug, status")
      .single();

    if (insertError) {
      rowErrors.push({ row: row.sheetRow, message: insertError.message });
      continue;
    }
    createdIds.push(created.id);
    console.log("imported", created.slug, created.id);
  }

  const importedRows = createdIds.length;
  const failedRows = rowErrors.length;
  const status =
    importedRows === 0 && failedRows > 0
      ? "failed"
      : failedRows > 0
        ? "partial"
        : "completed";

  const { error: logUpdateError } = await service
    .from("imports_log")
    .update({
      status,
      total_rows: parsed.totalRows,
      imported_rows: importedRows,
      failed_rows: failedRows,
      error_report_json: rowErrors.map((e) => ({
        row: e.row,
        message: e.message,
      })),
      finished_at: new Date().toISOString(),
    })
    .eq("id", logRow.id);
  if (logUpdateError) throw logUpdateError;
  console.log("imports_log finished", { status, importedRows, failedRows });

  if (importedRows !== 2 || failedRows !== 1 || status !== "partial") {
    throw new Error(
      `Unexpected import totals: imported=${importedRows} failed=${failedRows} status=${status}`,
    );
  }

  const { data: adminVisible, error: adminErr } = await service
    .from("products")
    .select("id, slug")
    .in("slug", [slugOk1, slugOk2]);
  if (adminErr) throw adminErr;
  if ((adminVisible ?? []).length !== 2) {
    throw new Error("Admin list missing imported products");
  }
  console.log("admin produtos ok", adminVisible.length);

  const { data: catalogVisible, error: catalogErr } = await anon
    .from("products")
    .select("id, slug, status")
    .in("slug", [slugOk1, slugOk2])
    .eq("status", "available");
  if (catalogErr) throw catalogErr;
  if ((catalogVisible ?? []).length !== 2) {
    throw new Error("Catalog (anon) missing imported available products");
  }
  console.log("catalogo anon ok", catalogVisible.length);

  const { error: delProdErr } = await service
    .from("products")
    .delete()
    .in("id", createdIds);
  if (delProdErr) throw delProdErr;
  const { error: delLogErr } = await service
    .from("imports_log")
    .delete()
    .eq("id", logRow.id);
  if (delLogErr) throw delLogErr;
  console.log("cleanup ok");

  console.log("T12 E2E PASS");
}

main().catch((error) => {
  console.error("T12 E2E FAIL", error);
  process.exit(1);
});
