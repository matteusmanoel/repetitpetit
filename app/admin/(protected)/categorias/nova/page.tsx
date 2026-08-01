import type { Metadata } from "next";
import Link from "next/link";

import { CategoryForm } from "@/components/admin/CategoryForm";
import { createCategoryAction } from "@/features/categories/actions";
import { requireAdminSession } from "@/features/admin/session";

export const metadata: Metadata = {
  title: "Nova categoria — Admin Repeti Petit",
};

export default async function NewCategoryPage() {
  await requireAdminSession();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/admin/categorias" className="underline-offset-4 hover:underline">
            ← Categorias
          </Link>
        </p>
        <h1 className="mt-2 font-heading text-2xl font-extrabold text-foreground">
          Nova categoria
        </h1>
      </div>

      <CategoryForm action={createCategoryAction} submitLabel="Criar categoria" />
    </div>
  );
}
