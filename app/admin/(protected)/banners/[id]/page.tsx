import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BannerForm } from "@/components/admin/BannerForm";
import { updateBannerAction } from "@/features/banners/actions";
import { getBannerById } from "@/features/banners/data";
import { requireAdminSession } from "@/features/admin/session";

export const metadata: Metadata = {
  title: "Editar banner — Admin Repeti Petit",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditBannerPage({ params }: PageProps) {
  await requireAdminSession();
  const { id } = await params;
  const banner = await getBannerById(id);

  if (!banner) {
    notFound();
  }

  const action = updateBannerAction.bind(null, banner.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/admin/banners" className="underline-offset-4 hover:underline">
            ← Banners
          </Link>
        </p>
        <h1 className="mt-2 font-heading text-2xl font-extrabold text-foreground">
          Editar banner
        </h1>
      </div>

      <BannerForm banner={banner} action={action} submitLabel="Salvar alterações" />
    </div>
  );
}
