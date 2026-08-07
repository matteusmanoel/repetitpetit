"use client";

import { useActionState } from "react";

import { sendBuyerMagicLinkAction } from "@/features/buyer/actions";
import { initialMagicLinkActionState } from "@/features/buyer/magic-link-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type BuyerMagicLinkFormProps = {
  /** Prefill from order customer e-mail (pedido page). */
  defaultEmail?: string | null;
  /** Relative next path after callback. */
  nextPath?: string;
  submitLabel?: string;
  className?: string;
};

/**
 * Formulário de magic link do comprador (SO-03). Não compartilha UI/actions do admin.
 */
export function BuyerMagicLinkForm({
  defaultEmail = "",
  nextPath = "/sacolinha",
  submitLabel = "Enviar link de acesso",
  className,
}: BuyerMagicLinkFormProps) {
  const [state, formAction, isPending] = useActionState(
    sendBuyerMagicLinkAction,
    initialMagicLinkActionState,
  );

  return (
    <form action={formAction} className={className} noValidate>
      <input type="hidden" name="next" value={nextPath} />
      <div className="flex flex-col gap-1.5 text-left">
        <Label htmlFor="buyer-magic-email">E-mail</Label>
        <Input
          id="buyer-magic-email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={defaultEmail ?? ""}
          placeholder="seu@email.com"
          required
          className="h-11 text-base"
        />
      </div>

      {state.error ? (
        <p role="alert" className="mt-3 text-sm font-medium text-destructive">
          {state.error}
        </p>
      ) : null}

      {state.sent ? (
        <p className="mt-3 text-sm text-muted-foreground" role="status">
          Se o e-mail estiver certo, enviamos um link para entrar. Abra no
          mesmo aparelho para ver sua Sacolinha.
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        disabled={isPending || state.sent}
        className="mt-4 w-full rounded-full"
      >
        {isPending ? "Enviando…" : state.sent ? "Link enviado" : submitLabel}
      </Button>
    </form>
  );
}
