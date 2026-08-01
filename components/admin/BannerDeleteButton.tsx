"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { deleteBannerAction } from "@/features/banners/actions";

export function BannerDeleteButton({ id, title }: { id: string; title: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm(`Excluir o banner “${title}”?`)) {
          return;
        }

        startTransition(() => {
          void deleteBannerAction(id);
        });
      }}
    >
      {isPending ? "Excluindo…" : "Excluir"}
    </Button>
  );
}
