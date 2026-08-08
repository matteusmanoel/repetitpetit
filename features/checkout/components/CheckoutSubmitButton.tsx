"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type CheckoutSubmitButtonProps = {
  disabled?: boolean;
  pending?: boolean;
};

/**
 * CTA do checkout — redireciona ao Checkout Pro (T16 / D08).
 * Enquanto a preferência MP é criada, mantém o botão estável (sem empty flash).
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
          Preparando pagamento…
        </>
      ) : (
        "Pagar com Mercado Pago"
      )}
    </Button>
  );
}
