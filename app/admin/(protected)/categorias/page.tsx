import type { Metadata } from "next";

import { CategoriesAdminClient } from "@/components/admin/CategoriesAdminClient";
import { listCategories } from "@/features/categories/data";
import { requireAdminSession } from "@/features/admin/session";

export const metadata: Metadata = {
  title: "Categorias — Admin Repeti Petit",
};

export default async function AdminCategoriasPage() {
  await requireAdminSession();
  const categories = await listCategories();

  return <CategoriesAdminClient categories={categories} />;
}
