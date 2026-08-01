import type { Metadata } from "next";
import Link from "next/link";

import { AdminProductForm } from "@/components/admin/AdminProductForm";
import { listActiveCategories } from "@/features/admin/product-queries";

export const metadata: Metadata = {
  title: "Nova peça — Admin Repeti Petit",
};

export default async function AdminNewProductPage() {
  const categories = await listActiveCategories();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          href="/admin/produtos"
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          ← Voltar para produtos
        </Link>
        <h1 className="font-heading text-2xl font-extrabold text-foreground">
          Nova peça
        </h1>
        <p className="text-sm text-muted-foreground">
          Preencha os dados da peça. Quantidade padrão é 1 (peça única).
        </p>
      </div>

      <AdminProductForm mode="create" categories={categories} />
    </div>
  );
}
