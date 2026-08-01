"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type CheckoutSubmitButtonProps = {
  disabled?: boolean;
  pending?: boolean;
};

/**
 * CTA do checkout (T15). Copy sem Mercado Pago — preferência MP é T17.
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
      className="h-12 w-full rounded-full text-base font-medium"
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Criando pedido…
        </>
      ) : (
        "Confirmar pedido"
      )}
    </Button>
  );
}
