"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { startMercadoPagoPaymentAction } from "@/features/payments/actions";

type PayWithMercadoPagoButtonProps = {
  publicCode: string;
};

/**
 * Retry de pagamento a partir de `/pedido/[codigo]`.
 * Mantém o botão estável enquanto a preferência MP é criada (sem blank flash).
 */
export function PayWithMercadoPagoButton({
  publicCode,
}: PayWithMercadoPagoButtonProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setPending(true);
    const result = await startMercadoPagoPaymentAction(publicCode);
    if (!result.success) {
      setPending(false);
      setError(result.error);
      return;
    }
    // pending permanece true até a navegação — evita UI vazia no handoff.
    window.location.assign(result.initPoint);
  }

  return (
    <div className="flex flex-col gap-2" aria-busy={pending}>
      <Button
        type="button"
        size="lg"
        disabled={pending}
        onClick={() => void handleClick()}
        className="h-11 w-full rounded-full"
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
      {pending ? (
        <p className="text-center text-xs text-muted-foreground" role="status">
          Abrindo o Mercado Pago — não feche esta página.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
