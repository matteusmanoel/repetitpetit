"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type BackToCatalogButtonProps = {
  className?: string;
};

/**
 * Voltar: `history.back()` quando há histórico; senão `/catalogo` (#97).
 */
export function BackToCatalogButton({ className }: BackToCatalogButtonProps) {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="ghost"
      size="lg"
      className={className ?? "h-11 w-full rounded-full text-base"}
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
          return;
        }
        router.push("/catalogo");
      }}
    >
      Voltar
    </Button>
  );
}
