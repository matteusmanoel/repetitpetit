"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CheckoutSubmitButtonProps = {
  disabled?: boolean;
  pending?: boolean;
};

/**
 * CTA do checkout — D133: Finalizar Pagamento + subtítulo +10 minutos extras.
 */
export function CheckoutSubmitButton({
  disabled,
  pending,
}: CheckoutSubmitButtonProps) {
  return (
    <Button
      type="submit"
      size="lg"
      disabled={disabled || pending}
      className={cn(
        "h-auto min-h-14 w-full flex-col gap-0.5 rounded-full py-3 text-base font-medium",
      )}
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          Preparando pagamento…
        </span>
      ) : (
        <>
          <span>Finalizar Pagamento</span>
          <span className="text-center text-sm font-bold leading-tight">
            +10 minutos extras
          </span>
        </>
      )}
    </Button>
  );
}
