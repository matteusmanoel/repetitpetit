"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type CheckoutSubmitButtonProps = {
  disabled?: boolean;
  pending?: boolean;
};

/**
 * CTA do checkout — redireciona ao Checkout Pro (T16 / D08).
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
          Redirecionando…
        </>
      ) : (
        "Pagar com Mercado Pago"
      )}
    </Button>
  );
}
