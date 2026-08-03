import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { GarmentPassport } from "@/components/admin/GarmentPassport";
import { getPassportData } from "@/features/passport/data";
import { normalizePassportRpCode } from "@/features/passport/normalize-rp-code";

type Params = Promise<{ rpCode: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { rpCode } = await params;
  const code = normalizePassportRpCode(rpCode);
  return {
    title: code
      ? `Passaporte ${code} — Admin Repeti Petit`
      : "Passaporte — Admin Repeti Petit",
  };
}

/**
 * Garment Passport deep link (SN-11 / D81 / D84).
 * QR encodes `/admin/passport/{staff_code}` — resolve by permanent RP code.
 */
export default async function AdminGarmentPassportPage({
  params,
}: {
  params: Params;
}) {
  const { rpCode } = await params;
  const data = await getPassportData(rpCode);

  if (!data) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/admin/produtos"
        className="text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        ← Voltar para produtos
      </Link>
      <GarmentPassport data={data} />
    </div>
  );
}
