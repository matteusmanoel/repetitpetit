"use client";

import { Button } from "@/components/ui/button";
import { BackToCatalogButton } from "@/features/catalog/components/BackToCatalogButton";

/**
 * PDP / card: peça em hold de outra sessão — sem compra e sem countdown alheio.
 */
export function ReservedByOtherActions() {
  return (
    <div className="flex flex-col gap-3">
      <p
        role="status"
        className="rounded-lg bg-muted px-3 py-2.5 text-sm text-muted-foreground"
      >
        Reservada por outra pessoa — volta ao catálogo se a compra não for
        finalizada a tempo.
      </p>
      <Button
        type="button"
        size="lg"
        className="h-13 w-full rounded-full text-base font-medium"
        disabled
      >
        Reservada
      </Button>
      <BackToCatalogButton />
    </div>
  );
}
