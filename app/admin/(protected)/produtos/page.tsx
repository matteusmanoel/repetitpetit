import type { Metadata } from "next";

import { AdminProductsClient } from "@/components/admin/AdminProductsClient";
import {
  PRODUCT_STATUSES,
  type ProductStatus,
} from "@/features/admin/product-constants";
import {
  listActiveCategories,
  listAdminProductsWithHolds,
} from "@/features/admin/product-queries";

export const metadata: Metadata = {
  title: "Produtos — Admin Repeti Petit",
};

type SearchParams = Promise<{
  q?: string;
  status?: string;
  saved?: string;
  edit?: string;
  create?: string;
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
  const saved =
    params.saved === "created" || params.saved === "updated"
      ? params.saved
      : null;
  const editId = params.edit?.trim() || null;
  const create =
    params.create === "1" || params.create === "true";
  const [products, categories] = await Promise.all([
    listAdminProductsWithHolds({ q, status }),
    listActiveCategories(),
  ]);

  return (
    <AdminProductsClient
      products={products}
      categories={categories}
      initialQuery={q}
      initialStatus={status}
      savedFlash={saved}
      initialEditId={editId}
      initialCreate={create}
    />
  );
}
