import type { Metadata } from "next";

import { BannersAdminClient } from "@/components/admin/BannersAdminClient";
import { listBanners } from "@/features/banners/data";
import { requireAdminSession } from "@/features/admin/session";

export const metadata: Metadata = {
  title: "Banners — Admin Repeti Petit",
};

export default async function AdminBannersPage() {
  await requireAdminSession();
  const banners = await listBanners();

  return <BannersAdminClient banners={banners} />;
}
