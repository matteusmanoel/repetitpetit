"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type Status = "exchanging" | "idle" | "saving" | "error" | "done" | "link_error";

/**
 * Formulário exibido em `/auth/reset` após o admin clicar no link de
 * redefinição enviado por e-mail (`POST /api/auth/reset-request`).
 * Troca `?code=` (PKCE) ou tokens no hash por sessão de recovery antes de
 * permitir `updateUser({ password })`.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const errorCode = searchParams.get("error_code") ?? searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<Status>("exchanging");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function establishRecoverySession() {
      if (errorCode || errorDescription) {
        if (!cancelled) {
          setStatus("link_error");
          setErrorMessage(
            errorDescription
              ? decodeURIComponent(errorDescription).replace(/\+/g, " ")
              : "Link inválido ou expirado. Solicite um novo em Admin → login.",
          );
        }
        return;
      }

      const supabase = createBrowserSupabaseClient();

      // Always exchange when `?code=` is present. Skipping for an existing
      // session would let `updateUser({ password })` change the wrong user.
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error) {
          setStatus("link_error");
          setErrorMessage(
            "Não foi possível validar o link. Solicite um novo em Admin → login.",
          );
          return;
        }
        setStatus("idle");
        return;
      }

      // No query code: accept hash/implicit recovery session if already present.
      const { data: existing, error: sessionError } =
        await supabase.auth.getSession();
      if (cancelled) return;
      if (existing.session?.user && !sessionError) {
        setStatus("idle");
        return;
      }

      setStatus("link_error");
      setErrorMessage(
        "Link inválido ou expirado. Solicite um novo em Admin → login.",
      );
    }

    void establishRecoverySession();
    return () => {
      cancelled = true;
    };
  }, [code, errorCode, errorDescription]);

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

  if (status === "exchanging") {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:p-8">
        <p className="text-sm text-muted-foreground">Validando link…</p>
      </div>
    );
  }

  if (status === "link_error") {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:p-8">
        <p role="alert" className="text-sm font-medium text-destructive">
          {errorMessage ?? "Link inválido ou expirado."}
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4 w-full"
          onClick={() => router.push("/admin/login")}
        >
          Voltar ao login
        </Button>
      </div>
    );
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
