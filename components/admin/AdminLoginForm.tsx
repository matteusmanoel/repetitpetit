"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useActionState } from "react";

import { signInAction } from "@/features/admin/actions";
import { initialSignInActionState } from "@/features/admin/sign-in-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ResetRequestStatus = "idle" | "sending" | "sent" | "missing_email";

export function AdminLoginForm() {
  const [state, formAction, isPending] = useActionState(
    signInAction,
    initialSignInActionState,
  );
  const emailRef = useRef<HTMLInputElement>(null);
  const [resetStatus, setResetStatus] = useState<ResetRequestStatus>("idle");

  async function handleResetRequest() {
    const email = emailRef.current?.value.trim() ?? "";

    if (!email) {
      setResetStatus("missing_email");
      return;
    }

    setResetStatus("sending");

    try {
      await fetch("/api/auth/reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } finally {
      setResetStatus("sent");
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <Image
          src="/brand/logo.png"
          alt="Repeti Petit"
          width={335}
          height={597}
          priority
          className="h-14 w-auto"
        />
        <h1 className="font-heading text-xl font-extrabold text-foreground">
          Painel administrativo
        </h1>
        <p className="text-sm text-muted-foreground">
          Entre com seu e-mail e senha para gerenciar a loja.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            ref={emailRef}
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            placeholder="seuemail@repetipetit.com.br"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Senha</Label>
            <button
              type="button"
              onClick={() => void handleResetRequest()}
              className="text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              Esqueci minha senha
            </button>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={6}
            required
          />
        </div>

        {state.error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {state.error}
          </p>
        ) : null}

        {resetStatus === "sent" ? (
          <p className="text-sm text-muted-foreground">
            Se o e-mail existir, enviamos um link de redefinição de senha.
          </p>
        ) : null}
        {resetStatus === "missing_email" ? (
          <p className="text-sm text-destructive">
            Informe seu e-mail acima antes de solicitar a redefinição.
          </p>
        ) : null}

        <Button
          type="submit"
          size="lg"
          disabled={isPending}
          className="mt-2 w-full"
        >
          {isPending ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </div>
  );
}
