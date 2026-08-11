"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  initialCategoryActionState,
  type CategoryActionState,
} from "@/features/categories/action-state";
import type { Category } from "@/features/categories/data";
import { slugify } from "@/lib/slug";

type CategoryFormProps = {
  category?: Category;
  action: (
    prev: CategoryActionState,
    formData: FormData,
  ) => Promise<CategoryActionState>;
  submitLabel: string;
  onSuccess?: () => void;
};

export function CategoryForm({
  category,
  action,
  submitLabel,
  onSuccess,
}: CategoryFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    action,
    initialCategoryActionState,
  );
  const [name, setName] = useState(category?.name ?? "");
  const [slugManual, setSlugManual] = useState(category?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(category));
  const [isActive, setIsActive] = useState(category?.is_active ?? true);
  const slug = slugTouched ? slugManual : slugify(name);

  useEffect(() => {
    if (!state.success) return;
    onSuccess?.();
    router.refresh();
  }, [state.success, onSuccess, router]);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nome *</Label>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          maxLength={120}
          aria-invalid={Boolean(state.fieldErrors?.name)}
        />
        {state.fieldErrors?.name ? (
          <p className="text-sm text-destructive">{state.fieldErrors.name}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="slug">Slug *</Label>
        <Input
          id="slug"
          name="slug"
          value={slug}
          onChange={(event) => {
            setSlugTouched(true);
            setSlugManual(event.target.value);
          }}
          required
          maxLength={120}
          aria-invalid={Boolean(state.fieldErrors?.slug)}
        />
        <p className="text-xs text-muted-foreground">
          Usado na URL do catálogo. Gerado automaticamente a partir do nome.
        </p>
        {state.fieldErrors?.slug ? (
          <p className="text-sm text-destructive">{state.fieldErrors.slug}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={category?.description ?? ""}
          maxLength={500}
          aria-invalid={Boolean(state.fieldErrors?.description)}
        />
        {state.fieldErrors?.description ? (
          <p className="text-sm text-destructive">{state.fieldErrors.description}</p>
        ) : null}
      </div>

      <ImageUploadField
        label="Imagem"
        bucket="productImages"
        pathPrefix="categories"
        initialUrl={category?.image_url}
        error={state.fieldErrors?.image_url}
        helpText="JPEG, PNG, WEBP ou AVIF · até 8MB"
      />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sort_order">Ordem de exibição</Label>
        <Input
          id="sort_order"
          name="sort_order"
          type="number"
          min={0}
          max={9999}
          step={1}
          defaultValue={category?.sort_order ?? 0}
          aria-invalid={Boolean(state.fieldErrors?.sort_order)}
        />
        <p className="text-xs text-muted-foreground">
          Menor número aparece primeiro na home (`ORDER BY sort_order`).
        </p>
        {state.fieldErrors?.sort_order ? (
          <p className="text-sm text-destructive">{state.fieldErrors.sort_order}</p>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
        <div className="flex flex-col">
          <Label htmlFor="is_active">Ativa na home</Label>
          <span className="text-xs text-muted-foreground">
            Só categorias ativas aparecem na vitrine pública.
          </span>
        </div>
        <input type="hidden" name="is_active" value={isActive ? "true" : "false"} />
        <Switch
          id="is_active"
          checked={isActive}
          onCheckedChange={setIsActive}
          aria-label="Categoria ativa na home"
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" className="h-12 w-full rounded-xl px-4 text-base sm:w-auto" disabled={isPending}>
        {isPending ? "Salvando…" : submitLabel}
      </Button>
    </form>
  );
}
