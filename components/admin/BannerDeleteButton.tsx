"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { deleteBannerAction } from "@/features/banners/actions";
import { brandToast } from "@/lib/brand-toast";

export function BannerDeleteButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="destructive"
      className="h-12 rounded-xl px-4 text-base"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm(`Excluir o banner “${title}”?`)) {
          return;
        }

        startTransition(async () => {
          try {
            await deleteBannerAction(id);
            brandToast.success("Banner excluído");
            router.refresh();
          } catch (error) {
            brandToast.error(
              error instanceof Error
                ? error.message
                : "Não foi possível excluir o banner.",
            );
          }
        });
      }}
    >
      {isPending ? "Excluindo…" : "Excluir"}
    </Button>
  );
}
