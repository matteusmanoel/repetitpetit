"use client";

import { Loader2, XIcon } from "lucide-react";
import { useEffect, useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { submitLeadAction } from "@/features/leads/actions";
import {
  LEAD_POPUP_SCROLL_THRESHOLD,
  LEAD_POPUP_SEEN_KEY,
} from "@/features/leads/constants";
import { useMediaQuery } from "@/hooks/use-media-query";

type Phase = "form" | "success";

/**
 * Soft lead capture na home: dispara ~30% de scroll, uma vez por device
 * (localStorage). Bottom sheet no mobile, modal no desktop. Sem cupom.
 */
export function LeadCapturePopup() {
  const [open, setOpen] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [phase, setPhase] = useState<Phase>("form");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const emailId = useId();

  useEffect(() => {
    try {
      if (window.localStorage.getItem(LEAD_POPUP_SEEN_KEY) === "1") {
        return;
      }
    } catch {
      // localStorage indisponível (privado/restrito) — ainda permite o popup.
    }
    setEligible(true);
  }, []);

  useEffect(() => {
    if (!eligible || open) {
      return;
    }

    function onScroll() {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) {
        return;
      }

      const progress = window.scrollY / scrollable;
      if (progress >= LEAD_POPUP_SCROLL_THRESHOLD) {
        setOpen(true);
      }
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [eligible, open]);

  function markSeen() {
    try {
      window.localStorage.setItem(LEAD_POPUP_SEEN_KEY, "1");
    } catch {
      // ignore quota / private mode
    }
    setEligible(false);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      markSeen();
      setPhase("form");
      setEmail("");
      setError(null);
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await submitLeadAction({ email });

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    markSeen();
    setPhase("success");
  }

  if (!eligible && !open) {
    return null;
  }

  // Aguarda matchMedia para escolher bottom sheet vs modal.
  if (isDesktop === null) {
    return null;
  }

  const title =
    phase === "success" ? "E-mail recebido!" : "5% de desconto no PIX";
  const description =
    phase === "success" ? (
      "Combinado — na primeira compra, peça o desconto no PIX."
    ) : (
      <>
        Compre sua primeira peça com{" "}
        <strong className="font-semibold text-foreground">
          5% de desconto no PIX
        </strong>
        . Deixe seu e-mail.
      </>
    );

  const formBody =
    phase === "success" ? (
      <Button
        type="button"
        className="h-11 w-full rounded-full text-base"
        onClick={() => handleOpenChange(false)}
      >
        Continuar navegando
      </Button>
    ) : (
      <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={emailId} className="text-sm font-medium">
            E-mail
          </Label>
          <Input
            id={emailId}
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isSubmitting}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${emailId}-error` : undefined}
            className="h-11 rounded-xl text-base md:text-base"
          />
          {error ? (
            <p
              id={`${emailId}-error`}
              role="alert"
              className="text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}
        </div>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-11 w-full rounded-full text-base"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Salvando…
            </>
          ) : (
            "Quero desconto"
          )}
        </Button>
      </form>
    );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent showCloseButton={false} className="gap-0 p-0 sm:max-w-md">
          <DialogHeader className="gap-2 px-5 pt-5 pr-12 pb-0">
            <DialogTitle className="font-heading text-xl font-bold leading-snug">
              {title}
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              {description}
            </DialogDescription>
          </DialogHeader>
          <CloseButton onClick={() => handleOpenChange(false)} />
          <div className="px-5 pt-4 pb-5">{formBody}</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="gap-0 rounded-t-2xl p-0"
      >
        <SheetHeader className="gap-2 px-5 pt-5 pr-12 pb-0 text-left">
          <SheetTitle className="font-heading text-xl font-bold leading-snug">
            {title}
          </SheetTitle>
          <SheetDescription className="text-base text-muted-foreground">
            {description}
          </SheetDescription>
        </SheetHeader>
        <CloseButton onClick={() => handleOpenChange(false)} />
        <div className="px-5 pt-4 pb-6">{formBody}</div>
      </SheetContent>
    </Sheet>
  );
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="absolute top-3 right-3 size-11"
      onClick={onClick}
      aria-label="Fechar"
    >
      <XIcon className="size-5" />
    </Button>
  );
}
