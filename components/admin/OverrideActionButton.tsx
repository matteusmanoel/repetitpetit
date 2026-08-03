"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { executeOverrideActionFromAdmin } from "@/features/override/override-action";
import { isOverrideActionVisible } from "@/features/override/visibility";

type Props = {
  productId: string;
  productStatus: string;
  hasPendingOnlineOrder?: boolean;
  /** Optional redirect after success (e.g. POS sell flow). */
  onSuccessHref?: string;
  className?: string;
};

const MIN_REASON = 10;

/**
 * Reusable Override control for Passport (SN-11) and POS (SN-08).
 * Does not implement the full POS — only the dialog + server action.
 */
export function OverrideActionButton({
  productId,
  productStatus,
  hasPendingOnlineOrder = false,
  onSuccessHref,
  className,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  if (
    !isOverrideActionVisible({
      productStatus,
      hasPendingOnlineOrder,
    })
  ) {
    return null;
  }

  const reasonOk = reason.trim().length >= MIN_REASON;

  function handleConfirm() {
    if (!reasonOk) {
      toast.error("Informe o motivo com pelo menos 10 caracteres.");
      return;
    }

    startTransition(async () => {
      const result = await executeOverrideActionFromAdmin({
        productId,
        reason: reason.trim(),
      });

      if (!result.ok) {
        if (result.reason === "already_paid") {
          toast.error("Peça já paga — override não permitido.");
        } else {
          toast.error(result.error);
        }
        return;
      }

      toast.success(
        result.outcome === "noop"
          ? "Nada a cancelar — peça já disponível."
          : "Override confirmado. Peça liberada para venda no balcão.",
      );
      setOpen(false);
      setReason("");
      router.refresh();
      if (onSuccessHref) {
        router.push(onSuccessHref);
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={className}
        onClick={() => setOpen(true)}
      >
        Override
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Override</DialogTitle>
            <DialogDescription>
              Cancela a reserva online (Hold Session e/ou pagamento pendente)
              para liberar a peça no balcão. Esta ação é registrada na auditoria.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="override-reason">Motivo (obrigatório)</Label>
            <Textarea
              id="override-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ex.: cliente na loja quer comprar esta peça agora"
              minLength={MIN_REASON}
              disabled={isPending}
              aria-invalid={reason.length > 0 && !reasonOk}
            />
            <p className="text-xs text-muted-foreground">
              Mínimo de {MIN_REASON} caracteres.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={!reasonOk || isPending}
            >
              {isPending ? "Confirmando…" : "Confirmar Override"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
