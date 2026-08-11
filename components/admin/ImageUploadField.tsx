"use client";

import { useState, type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UploadBucketKey } from "@/lib/supabase/upload-buckets";

type ImageUploadFieldProps = {
  name?: string;
  label: string;
  bucket: UploadBucketKey;
  pathPrefix?: string;
  initialUrl?: string | null;
  required?: boolean;
  error?: string;
  helpText?: string;
};

type UploadStatus = "idle" | "uploading" | "error";

/**
 * Campo de upload de imagem via `POST /api/upload` (T04).
 * Faz o upload no select do arquivo, grava a URL pública num hidden input
 * e mostra preview — o submit do formulário só envia a URL já hospedada.
 */
export function ImageUploadField({
  name = "image_url",
  label,
  bucket,
  pathPrefix,
  initialUrl = null,
  required = false,
  error,
  helpText,
}: ImageUploadFieldProps) {
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setStatus("uploading");
    setUploadError(null);

    const body = new FormData();
    body.set("file", file);
    body.set("bucket", bucket);

    if (pathPrefix) {
      body.set("pathPrefix", pathPrefix);
    }

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body,
      });

      const payload = (await response.json().catch(() => null)) as
        | { url?: string; error?: string }
        | null;

      if (!response.ok || !payload?.url) {
        setStatus("error");
        setUploadError(payload?.error ?? "Falha ao enviar a imagem.");
        return;
      }

      setUrl(payload.url);
      setStatus("idle");
    } catch {
      setStatus("error");
      setUploadError("Falha de rede ao enviar a imagem.");
    } finally {
      // Permite reenviar o mesmo arquivo se o usuário quiser tentar de novo.
      event.target.value = "";
    }
  }

  function clearImage() {
    setUrl(null);
    setUploadError(null);
    setStatus("idle");
  }

  const shownError = uploadError ?? error;

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`${name}-file`}>
        {label}
        {required ? " *" : ""}
      </Label>

      <input type="hidden" name={name} value={url ?? ""} required={required} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex h-28 w-full shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/40 sm:w-40">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element -- preview admin de URL remota do Storage
            <img src={url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="px-3 text-center text-xs text-muted-foreground">
              Nenhuma imagem
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <Input
            id={`${name}-file`}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={(event) => void handleFileChange(event)}
            disabled={status === "uploading"}
            aria-invalid={Boolean(shownError)}
          />
          <div className="flex flex-wrap gap-2">
            {url ? (
              <Button type="button" variant="outline" className="h-12 rounded-xl px-4 text-base" onClick={clearImage}>
                Remover imagem
              </Button>
            ) : null}
            {status === "uploading" ? (
              <span className="text-xs text-muted-foreground">Enviando…</span>
            ) : null}
          </div>
          {helpText ? (
            <p className="text-xs text-muted-foreground">{helpText}</p>
          ) : null}
        </div>
      </div>

      {shownError ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {shownError}
        </p>
      ) : null}
    </div>
  );
}
