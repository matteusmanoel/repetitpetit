"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  initialBannerActionState,
  type BannerActionState,
} from "@/features/banners/action-state";
import type { Banner } from "@/features/banners/data";

type BannerFormProps = {
  banner?: Banner;
  action: (
    prev: BannerActionState,
    formData: FormData,
  ) => Promise<BannerActionState>;
  submitLabel: string;
  onSuccess?: () => void;
};

export function BannerForm({
  banner,
  action,
  submitLabel,
  onSuccess,
}: BannerFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    action,
    initialBannerActionState,
  );
  const [isActive, setIsActive] = useState(banner?.is_active ?? true);

  useEffect(() => {
    if (!state.success) return;
    onSuccess?.();
    router.refresh();
  }, [state.success, onSuccess, router]);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          name="title"
          defaultValue={banner?.title ?? ""}
          maxLength={160}
          aria-invalid={Boolean(state.fieldErrors?.title)}
        />
        {state.fieldErrors?.title ? (
          <p className="text-sm text-destructive">{state.fieldErrors.title}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="subtitle">Subtítulo</Label>
        <Input
          id="subtitle"
          name="subtitle"
          defaultValue={banner?.subtitle ?? ""}
          maxLength={240}
          aria-invalid={Boolean(state.fieldErrors?.subtitle)}
        />
        {state.fieldErrors?.subtitle ? (
          <p className="text-sm text-destructive">{state.fieldErrors.subtitle}</p>
        ) : null}
      </div>

      <ImageUploadField
        label="Imagem"
        bucket="productImages"
        pathPrefix="banners"
        initialUrl={banner?.image_url}
        required
        error={state.fieldErrors?.image_url}
        helpText="Obrigatória · JPEG, PNG, WEBP ou AVIF · até 8MB"
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cta_label">Texto do botão</Label>
          <Input
            id="cta_label"
            name="cta_label"
            defaultValue={banner?.cta_label ?? ""}
            maxLength={80}
            placeholder="Ver novidades"
            aria-invalid={Boolean(state.fieldErrors?.cta_label)}
          />
          {state.fieldErrors?.cta_label ? (
            <p className="text-sm text-destructive">{state.fieldErrors.cta_label}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cta_href">Link do botão</Label>
          <Input
            id="cta_href"
            name="cta_href"
            defaultValue={banner?.cta_href ?? ""}
            maxLength={500}
            placeholder="/catalogo"
            aria-invalid={Boolean(state.fieldErrors?.cta_href)}
          />
          <p className="text-xs text-muted-foreground">
            Caminho interno (`/catalogo`) ou URL completa.
          </p>
          {state.fieldErrors?.cta_href ? (
            <p className="text-sm text-destructive">{state.fieldErrors.cta_href}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sort_order">Ordem de exibição</Label>
        <Input
          id="sort_order"
          name="sort_order"
          type="number"
          min={0}
          max={9999}
          step={1}
          defaultValue={banner?.sort_order ?? 0}
          aria-invalid={Boolean(state.fieldErrors?.sort_order)}
        />
        <p className="text-xs text-muted-foreground">
          Menor número aparece primeiro na home.
        </p>
        {state.fieldErrors?.sort_order ? (
          <p className="text-sm text-destructive">{state.fieldErrors.sort_order}</p>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
        <div className="flex flex-col">
          <Label htmlFor="is_active">Ativo na home</Label>
          <span className="text-xs text-muted-foreground">
            Só banners ativos aparecem na vitrine pública.
          </span>
        </div>
        <input type="hidden" name="is_active" value={isActive ? "true" : "false"} />
        <Switch
          id="is_active"
          checked={isActive}
          onCheckedChange={setIsActive}
          aria-label="Banner ativo na home"
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={isPending} className="w-full sm:w-auto">
        {isPending ? "Salvando…" : submitLabel}
      </Button>
    </form>
  );
}
