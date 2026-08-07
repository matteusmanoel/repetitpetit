import type { Metadata } from "next";
import Link from "next/link";

import { AdminAiIntakeClient } from "@/components/admin/AdminAiIntakeClient";
import { isAiIntakeConfigured } from "@/features/admin/ai-intake/ai-config";
import { listActiveCategories } from "@/features/admin/product-queries";
import { requireAdminSession } from "@/features/admin/session";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Cadastrar com IA — Admin Repeti Petit",
};

export default async function AdminAiIntakePage() {
  await requireAdminSession();
  const categories = await listActiveCategories();
  const aiConfigured = isAiIntakeConfigured(env);

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
          Cadastrar com IA
        </h1>
        <p className="text-sm text-muted-foreground">
          Fotos + áudio opcional → preview editável → confirmação cria a peça e
          o código RP, depois imprime etiquetas uma a uma.
        </p>
      </div>

      <AdminAiIntakeClient
        categories={categories}
        aiConfigured={aiConfigured}
      />
    </div>
  );
}
