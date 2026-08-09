import type { Metadata } from "next";

import { AdminAiIntakeClient } from "@/components/admin/AdminAiIntakeClient";
import { isAiIntakeConfigured } from "@/features/admin/ai-intake/ai-config";
import { listActiveCategories } from "@/features/admin/product-queries";
import { requireAdminSession } from "@/features/admin/session";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Cadastro em massa — Admin Repeti Petit",
};

export default async function AdminAiIntakePage() {
  await requireAdminSession();
  const categories = await listActiveCategories();
  const aiConfigured = isAiIntakeConfigured(env);

  return (
    <AdminAiIntakeClient
      categories={categories}
      aiConfigured={aiConfigured}
    />
  );
}
