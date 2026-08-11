"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { BannerForm } from "@/components/admin/BannerForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createBannerAction,
  deleteBannerAction,
  updateBannerAction,
} from "@/features/banners/actions";
import type { Banner } from "@/features/banners/data";
import { brandToast } from "@/lib/brand-toast";

export function BannersAdminClient({ banners }: { banners: Banner[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(banner: Banner) {
    setEditing(banner);
    setOpen(true);
  }

  function handleDelete(banner: Banner) {
    const title = banner.title?.trim() || "este banner";
    if (!window.confirm(`Excluir o banner “${title}”?`)) return;
    setDeletingId(banner.id);
    startTransition(async () => {
      try {
        await deleteBannerAction(banner.id);
        brandToast.success("Banner excluído");
        router.refresh();
      } catch (error) {
        brandToast.error(
          error instanceof Error
            ? error.message
            : "Não foi possível excluir o banner.",
        );
      } finally {
        setDeletingId(null);
      }
    });
  }

  const boundUpdate = editing
    ? updateBannerAction.bind(null, editing.id)
    : createBannerAction;

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
        <Button type="button" className="h-12 rounded-xl px-4 text-base" onClick={openCreate}>
          Novo banner
        </Button>
      </div>

      {banners.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhum banner cadastrado ainda.
          </p>
          <Button type="button" className="mt-4" onClick={openCreate}>
            Criar primeiro banner
          </Button>
        </div>
      ) : (
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
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 rounded-xl px-4 text-base"
                  onClick={() => openEdit(banner)}
                >
                  Editar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="h-12 rounded-xl px-4 text-base"
                  disabled={isPending && deletingId === banner.id}
                  onClick={() => handleDelete(banner)}
                >
                  {deletingId === banner.id ? "Excluindo…" : "Excluir"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar banner" : "Novo banner"}
            </DialogTitle>
          </DialogHeader>
          {open ? (
            <BannerForm
              key={editing?.id ?? "new"}
              banner={editing ?? undefined}
              action={boundUpdate}
              submitLabel={editing ? "Salvar" : "Criar banner"}
              onSuccess={() => setOpen(false)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
