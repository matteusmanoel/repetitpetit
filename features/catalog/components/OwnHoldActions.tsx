"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCountdown, isReservationExpired } from "@/features/cart/countdown";
import { useCartStore } from "@/features/cart/store";
import { BackToCatalogButton } from "@/features/catalog/components/BackToCatalogButton";
import { cn } from "@/lib/utils";

type OwnHoldActionsProps = {
  productId: string;
  expiresAt: string;
};

/**
 * PDP da dona do Hold: countdown, Finalizar compra, Liberar (confirmação), Voltar.
 * Liberação imediata via `POST /api/hold/release` (SN-02). Fechar o browser não libera.
 */
export function OwnHoldActions({ productId, expiresAt }: OwnHoldActionsProps) {
  const router = useRouter();
  const holdSessionId = useCartStore((s) => s.holdSessionId);
  const removeItem = useCartStore((s) => s.removeItem);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const expired = isReservationExpired(expiresAt);
  const remainingLabel = formatCountdown(expiresAt, nowMs);

  const checkoutHref = holdSessionId
    ? `/checkout?holdSessionId=${encodeURIComponent(holdSessionId)}`
    : "/checkout";

  function handleRelease() {
    startTransition(async () => {
      try {
        const response = await fetch("/api/hold/release", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });

        if (!response.ok) {
          toast.message("Não foi possível liberar a peça. Tente de novo.");
          return;
        }

        removeItem(productId);
        setConfirmOpen(false);
        toast.message("Peça liberada");
        router.refresh();
        router.push("/catalogo");
      } catch {
        toast.message("Falha de rede ao liberar. Verifique a conexão.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p
        role="status"
        className={cn(
          "rounded-lg px-3 py-2.5 text-sm font-medium",
          expired
            ? "bg-muted text-muted-foreground"
            : "bg-secondary/15 text-foreground",
        )}
      >
        {expired
          ? "Sua reserva expirou — você pode tentar de novo se a peça ainda estiver disponível."
          : `Reservada para você — ${remainingLabel} restantes`}
      </p>

      {expired ? (
        <Button
          type="button"
          size="lg"
          className="h-13 w-full rounded-full text-base font-medium"
          disabled
        >
          Finalizar compra
        </Button>
      ) : (
        <Button
          asChild
          size="lg"
          className="h-13 w-full rounded-full text-base font-medium"
        >
          <Link href={checkoutHref}>Finalizar compra</Link>
        </Button>
      )}

      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-13 w-full rounded-full text-base font-medium"
        disabled={isPending}
        onClick={() => setConfirmOpen(true)}
      >
        Liberar
      </Button>

      <BackToCatalogButton />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Liberar esta peça?</DialogTitle>
            <DialogDescription>
              Ela volta ao catálogo na hora e outras pessoas poderão reservá-la.
              Fechar o navegador não libera — só o tempo da reserva ou este botão.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-11 min-h-11"
              onClick={() => setConfirmOpen(false)}
              disabled={isPending}
            >
              Manter reserva
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-11 min-h-11"
              disabled={isPending}
              onClick={handleRelease}
            >
              {isPending ? "Liberando…" : "Sim, liberar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
