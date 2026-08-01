"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { deleteCategoryAction } from "@/features/categories/actions";

export function CategoryDeleteButton({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (
          !window.confirm(
            `Excluir a categoria “${name}”? Produtos vinculados ficam sem categoria.`,
          )
        ) {
          return;
        }

        startTransition(() => {
          void deleteCategoryAction(id);
        });
      }}
    >
      {isPending ? "Excluindo…" : "Excluir"}
    </Button>
  );
}
