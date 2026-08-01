import type { Metadata } from "next";
import Link from "next/link";

import { BannerForm } from "@/components/admin/BannerForm";
import { createBannerAction } from "@/features/banners/actions";
import { requireAdminSession } from "@/features/admin/session";

export const metadata: Metadata = {
  title: "Novo banner — Admin Repeti Petit",
};

export default async function NewBannerPage() {
  await requireAdminSession();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/admin/banners" className="underline-offset-4 hover:underline">
            ← Banners
          </Link>
        </p>
        <h1 className="mt-2 font-heading text-2xl font-extrabold text-foreground">
          Novo banner
        </h1>
      </div>

      <BannerForm action={createBannerAction} submitLabel="Criar banner" />
    </div>
  );
}
