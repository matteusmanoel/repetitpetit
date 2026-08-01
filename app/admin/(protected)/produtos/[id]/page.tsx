import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminProductForm } from "@/components/admin/AdminProductForm";
import {
  getAdminProduct,
  listActiveCategories,
} from "@/features/admin/product-queries";

export const metadata: Metadata = {
  title: "Editar peça — Admin Repeti Petit",
};

type Params = Promise<{ id: string }>;

export default async function AdminEditProductPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    getAdminProduct(id),
    listActiveCategories(),
  ]);

  if (!product) {
    notFound();
  }

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
          Editar peça
        </h1>
        <p className="text-sm text-muted-foreground">{product.name}</p>
      </div>

      <AdminProductForm
        mode="edit"
        product={product}
        categories={categories}
      />
    </div>
  );
}
