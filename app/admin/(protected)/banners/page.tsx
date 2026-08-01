import type { Metadata } from "next";
import Link from "next/link";

import { BannerList } from "@/components/admin/BannerList";
import { Button } from "@/components/ui/button";
import { listBanners } from "@/features/banners/data";
import { requireAdminSession } from "@/features/admin/session";

export const metadata: Metadata = {
  title: "Banners — Admin Repeti Petit",
};

export default async function AdminBannersPage() {
  await requireAdminSession();
  const banners = await listBanners();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-foreground">
            Banners
          </h1>
          <p className="text-sm text-muted-foreground">
            Destaques da home. Banners ativos com ordem menor aparecem primeiro.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/banners/novo">Novo banner</Link>
        </Button>
      </div>

      <BannerList banners={banners} />
    </div>
  );
}
