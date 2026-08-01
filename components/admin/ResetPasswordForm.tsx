"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type Status = "idle" | "saving" | "error" | "done";

/**
 * Formulário exibido em `/auth/reset` após o admin clicar no link de
 * redefinição enviado por e-mail (`POST /api/auth/reset-request`). O
 * Supabase JS detecta a sessão de recuperação a partir da URL automaticamente
 * (`createBrowserSupabaseClient`).
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 6) {
      setStatus("error");
      setErrorMessage("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setStatus("error");
      setErrorMessage("As senhas não coincidem.");
      return;
    }

    setStatus("saving");
    setErrorMessage(null);

    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setStatus("error");
      setErrorMessage(
        "Não foi possível redefinir a senha. Solicite um novo link e tente de novo.",
      );
      return;
    }

    setStatus("done");
    setTimeout(() => router.push("/admin/login"), 1500);
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:p-8">
        <p className="text-sm font-medium text-foreground">
          Senha redefinida! Redirecionando para o login...
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"
      noValidate
    >
      <div className="flex flex-col gap-1 text-center">
        <h1 className="font-heading text-xl font-extrabold text-foreground">
          Nova senha
        </h1>
        <p className="text-sm text-muted-foreground">
          Escolha uma nova senha para sua conta.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Nova senha</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={6}
          required
          autoComplete="new-password"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          minLength={6}
          required
          autoComplete="new-password"
        />
      </div>

      {status === "error" && errorMessage ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {errorMessage}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        disabled={status === "saving"}
        className="mt-2 w-full"
      >
        {status === "saving" ? "Salvando..." : "Salvar nova senha"}
      </Button>
    </form>
  );
}
