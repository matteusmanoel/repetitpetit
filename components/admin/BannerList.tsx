import Link from "next/link";

import { BannerDeleteButton } from "@/components/admin/BannerDeleteButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Banner } from "@/features/banners/data";

export function BannerList({ banners }: { banners: Banner[] }) {
  if (banners.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
        <p className="text-sm text-muted-foreground">Nenhum banner cadastrado ainda.</p>
        <Button asChild className="mt-4">
          <Link href="/admin/banners/novo">Criar primeiro banner</Link>
        </Button>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {banners.map((banner) => (
        <li
          key={banner.id}
          className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={banner.image_url}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-medium text-foreground">
                  {banner.title?.trim() || "Banner sem título"}
                </p>
                <Badge variant={banner.is_active ? "default" : "secondary"}>
                  {banner.is_active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                ordem {banner.sort_order}
                {banner.cta_href ? ` · CTA ${banner.cta_href}` : ""}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/banners/${banner.id}`}>Editar</Link>
            </Button>
            <BannerDeleteButton
              id={banner.id}
              title={banner.title?.trim() || "este banner"}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
