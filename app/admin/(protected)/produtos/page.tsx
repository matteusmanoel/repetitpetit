import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { AdminProductRowActions } from "@/components/admin/AdminProductRowActions";
import { AdminProductStatusFilter } from "@/components/admin/AdminProductStatusFilter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PRODUCT_STATUS_LABELS,
  PRODUCT_STATUSES,
  formatPriceBRL,
  type ProductStatus,
} from "@/features/admin/product-constants";
import { listAdminProducts } from "@/features/admin/product-queries";

export const metadata: Metadata = {
  title: "Produtos — Admin Repeti Petit",
};

type SearchParams = Promise<{
  q?: string;
  status?: string;
}>;

function resolveStatusFilter(raw?: string): ProductStatus | "all" {
  if (!raw || raw === "all") return "all";
  return (PRODUCT_STATUSES as readonly string[]).includes(raw)
    ? (raw as ProductStatus)
    : "all";
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status = resolveStatusFilter(params.status);
  const products = await listAdminProducts({ q, status });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-foreground">Produtos</h1>
          <p className="text-sm text-muted-foreground">
            Cadastre, edite e desative peças do catálogo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/produtos/importar">Importar XLSX</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/admin/produtos/novo">Nova peça</Link>
          </Button>
        </div>
      </div>

      <form
        method="get"
        className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-end"
      >
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="q" className="text-xs font-medium text-muted-foreground">
            Buscar
          </label>
          <Input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Nome, slug ou marca"
          />
        </div>
        <div className="flex w-full flex-col gap-1.5 sm:w-48">
          <span className="text-xs font-medium text-muted-foreground">Status</span>
          <AdminProductStatusFilter name="status" defaultValue={status} />
        </div>
        <Button type="submit" variant="outline" size="sm">
          Filtrar
        </Button>
      </form>

      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          Nenhuma peça encontrada com esses filtros.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Foto</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden sm:table-cell">Marca</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="relative size-10 overflow-hidden rounded-md bg-muted">
                      {product.cover_image_url ? (
                        <Image
                          src={product.cover_image_url}
                          alt=""
                          fill
                          unoptimized
                          className="object-cover"
                          sizes="40px"
                        />
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">
                        {product.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {product.size_label}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {product.brand ?? "—"}
                  </TableCell>
                  <TableCell>{formatPriceBRL(Number(product.price))}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {PRODUCT_STATUS_LABELS[product.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <AdminProductRowActions
                      productId={product.id}
                      productName={product.name}
                      status={product.status}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
