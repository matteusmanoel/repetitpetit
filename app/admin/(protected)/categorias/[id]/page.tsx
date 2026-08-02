import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CategoryForm } from "@/components/admin/CategoryForm";
import { updateCategoryAction } from "@/features/categories/actions";
import { getCategoryById } from "@/features/categories/data";
import { requireAdminSession } from "@/features/admin/session";

export const metadata: Metadata = {
  title: "Editar categoria — Admin Repeti Petit",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditCategoryPage({ params }: PageProps) {
  await requireAdminSession();
  const { id } = await params;
  const category = await getCategoryById(id);

  if (!category) {
    notFound();
  }

  const action = updateCategoryAction.bind(null, category.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/admin/categorias" className="underline-offset-4 hover:underline">
            ← Categorias
          </Link>
        </p>
        <h1 className="mt-2 font-heading text-2xl font-extrabold text-foreground">
          Editar categoria
        </h1>
      </div>

      <CategoryForm
        category={category}
        action={action}
        submitLabel="Salvar alterações"
      />
    </div>
  );
}
