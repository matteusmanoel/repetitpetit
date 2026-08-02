import type { Metadata } from "next";
import Link from "next/link";

import { CategoryList } from "@/components/admin/CategoryList";
import { Button } from "@/components/ui/button";
import { listCategories } from "@/features/categories/data";
import { requireAdminSession } from "@/features/admin/session";

export const metadata: Metadata = {
  title: "Categorias — Admin Repeti Petit",
};

export default async function AdminCategoriesPage() {
  await requireAdminSession();
  const categories = await listCategories();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-foreground">
            Categorias
          </h1>
          <p className="text-sm text-muted-foreground">
            Organize a vitrine. Categorias ativas com ordem menor aparecem primeiro
            na home.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/categorias/nova">Nova categoria</Link>
        </Button>
      </div>

      <CategoryList categories={categories} />
    </div>
  );
}
