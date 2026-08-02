import type { Metadata } from "next";

import { AdminProductsImportClient } from "@/components/admin/AdminProductsImportClient";

export const metadata: Metadata = {
  title: "Importar produtos — Admin Repeti Petit",
};

export default function AdminProductsImportPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-extrabold text-foreground">
          Importar produtos (XLSX)
        </h1>
        <p className="text-sm text-muted-foreground">
          Carregue o acervo inicial em lote. Linhas válidas viram peças no
          catálogo; linhas com erro entram no relatório da importação.
        </p>
      </div>

      <AdminProductsImportClient />
    </div>
  );
}
