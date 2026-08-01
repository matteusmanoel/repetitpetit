"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { importProductsXlsxAction } from "@/features/admin/product-import-actions";
import { initialProductImportActionState } from "@/features/admin/product-import-state";

const PRODUCT_XLSX_HEADERS = [
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

export function AdminProductsImportClient() {
  const [state, formAction, pending] = useActionState(
    importProductsXlsxAction,
    initialProductImportActionState,
  );
  const [fileName, setFileName] = useState<string>("");

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="font-heading text-base font-extrabold text-foreground">
          Template da planilha
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Baixe o modelo com os campos do acervo (marca, grupo de tamanho,
          gênero, condição, etc.) e uma linha de exemplo. Documentação completa
          em{" "}
          <code className="rounded bg-muted px-1 text-xs">
            docs/admin-xlsx-import-template.md
          </code>
          .
        </p>
        <ul className="mt-3 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
          {PRODUCT_XLSX_HEADERS.map((header) => (
            <li
              key={header}
              className="rounded-md border border-border bg-muted/40 px-2 py-0.5 font-mono"
            >
              {header}
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <Button asChild variant="outline">
            <Link href="/admin/produtos/importar/template" prefetch={false}>
              Baixar template XLSX
            </Link>
          </Button>
        </div>
      </div>

      <form
        action={formAction}
        className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-5"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="file">Arquivo .xlsx</Label>
          <Input
            id="file"
            name="file"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            required
            disabled={pending}
            onChange={(event) => {
              setFileName(event.target.files?.[0]?.name ?? "");
            }}
          />
          {fileName ? (
            <p className="text-xs text-muted-foreground">Selecionado: {fileName}</p>
          ) : null}
        </div>

        {state.error ? (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Importando…" : "Importar planilha"}
          </Button>
          <Button asChild type="button" variant="ghost">
            <Link href="/admin/produtos">Voltar para produtos</Link>
          </Button>
        </div>
      </form>

      {state.summary ? (
        <section
          aria-live="polite"
          className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-5"
        >
          <div>
            <h2 className="font-heading text-base font-extrabold text-foreground">
              Resultado da importação
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Arquivo <span className="font-medium text-foreground">{state.summary.fileName}</span>
              {" · "}
              log <span className="font-mono text-xs">{state.summary.importId}</span>
            </p>
          </div>

          <dl className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border border-border px-3 py-3">
              <dt className="text-xs text-muted-foreground">Total</dt>
              <dd className="font-heading text-2xl font-extrabold">
                {state.summary.totalRows}
              </dd>
            </div>
            <div className="rounded-lg border border-border px-3 py-3">
              <dt className="text-xs text-muted-foreground">Importadas</dt>
              <dd className="font-heading text-2xl font-extrabold text-foreground">
                {state.summary.importedRows}
              </dd>
            </div>
            <div className="rounded-lg border border-border px-3 py-3">
              <dt className="text-xs text-muted-foreground">Com erro</dt>
              <dd className="font-heading text-2xl font-extrabold text-destructive">
                {state.summary.failedRows}
              </dd>
            </div>
          </dl>

          {state.summary.importedRows > 0 ? (
            <p className="text-sm text-muted-foreground">
              Peças importadas já aparecem em{" "}
              <Link href="/admin/produtos" className="underline underline-offset-2">
                /admin/produtos
              </Link>{" "}
              e, se o status for disponível, em{" "}
              <Link href="/catalogo" className="underline underline-offset-2">
                /catalogo
              </Link>
              .
            </p>
          ) : null}

          {state.summary.errors.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Linha</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.summary.errors.map((item) => (
                    <TableRow key={`${item.row}-${item.message}`}>
                      <TableCell className="font-mono text-xs">{item.row}</TableCell>
                      <TableCell className="text-sm">{item.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
