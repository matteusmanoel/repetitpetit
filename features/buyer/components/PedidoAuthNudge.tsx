"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BuyerMagicLinkForm } from "@/features/buyer/components/BuyerMagicLinkForm";
import { BUYER_DEFAULT_NEXT_PATH } from "@/features/buyer/constants";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type PedidoAuthNudgeProps = {
  /** Kept for call-site stability; landing after OTP is `/sacolinha` (D128). */
  publicCode: string;
  customerEmail: string | null;
  /** Buyer already has Sacolinha session. */
  hasBuyerSession: boolean;
  /**
   * Soft nudge only after payment path (not pending/failed).
   * D109: sheet/tooltip — never hard login wall.
   */
  showNudge: boolean;
};

/**
 * Soft post-payment nudge (D103 / D109): magic link or CTA Sacolinha.
 * Renders as bottom sheet on mobile-first; dismissible.
 * Magic link `next` → `/sacolinha` (painel mínimo), not home (D128).
 */
export function PedidoAuthNudge({
  customerEmail,
  hasBuyerSession,
  showNudge,
}: PedidoAuthNudgeProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!showNudge || hasBuyerSession) return;
    const timer = window.setTimeout(() => setOpen(true), 600);
    return () => window.clearTimeout(timer);
  }, [showNudge, hasBuyerSession]);

  if (!showNudge) {
    return null;
  }

  if (hasBuyerSession) {
    return (
      <div className="mt-6 rounded-3xl border border-primary/25 bg-primary/5 px-4 py-4 text-left">
        <p className="text-sm font-medium text-foreground">
          Sua Sacolinha está pronta para acompanhar as peças.
        </p>
        <Link
          href="/sacolinha"
          className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground"
        >
          Ver minha Sacolinha
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mt-6 rounded-3xl border border-border px-4 py-4 text-left">
        <p className="text-sm font-medium text-foreground">
          Crie seu acesso para ver a Sacolinha
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Sem senha — enviamos um link no e-mail do pedido. Você já pode
          acompanhar este pedido abaixo, sem entrar.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-3 h-11 w-full rounded-full"
          onClick={() => setOpen(true)}
        >
          Receber link de acesso
        </Button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85vh] rounded-t-3xl px-4 pb-8 pt-2 sm:mx-auto sm:max-w-lg"
        >
          <SheetHeader className="text-left">
            <SheetTitle>Acesso à Sacolinha</SheetTitle>
            <SheetDescription>
              Magic link no e-mail — sem senha. Depois você vê as peças
              aguardando retirada.
            </SheetDescription>
          </SheetHeader>
          <BuyerMagicLinkForm
            className="mt-4"
            defaultEmail={customerEmail}
            nextPath={BUYER_DEFAULT_NEXT_PATH}
            submitLabel="Enviar magic link"
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
