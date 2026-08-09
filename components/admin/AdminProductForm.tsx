"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import { AdminProductImageManager } from "@/components/admin/AdminProductImageManager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  PRODUCT_CONDITION_LABELS,
  PRODUCT_CONDITIONS,
  PRODUCT_GENDER_LABELS,
  PRODUCT_GENDERS,
  PRODUCT_SIZE_LABELS,
  PRODUCT_STATUS_LABELS,
  PRODUCT_STATUSES,
  SIZE_GROUP_LABELS,
  SIZE_GROUPS,
  isProductSizeLabel,
  slugifyProductName,
  type ProductSizeLabel,
} from "@/features/admin/product-constants";
import {
  createProductAction,
  deactivateProductAction,
  updateProductAction,
} from "@/features/admin/product-actions";
import {
  initialProductActionState,
  type ProductActionState,
  type ProductImageInput,
} from "@/features/admin/product-schemas";
import type { CategoryOption, ProductWithImages } from "@/features/admin/product-types";
import {
  productLabelPdfPath,
  productLabelPrintPath,
} from "@/lib/qr/passport-url";

type Props = {
  mode: "create" | "edit";
  product?: ProductWithImages;
  categories: CategoryOption[];
};

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p className="text-xs text-destructive" role="alert">
      {messages[0]}
    </p>
  );
}

export function AdminProductForm({ mode, product, categories }: Props) {
  const [name, setName] = useState(product?.name ?? "");
  const [slugManual, setSlugManual] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [sizeLabel, setSizeLabel] = useState<ProductSizeLabel | "">(() =>
    product?.size_label && isProductSizeLabel(product.size_label)
      ? product.size_label
      : "",
  );
  const [sizeGroup, setSizeGroup] = useState(product?.size_group ?? "2_3a");
  const [gender, setGender] = useState(product?.gender ?? "unissex");
  const [condition, setCondition] = useState(product?.condition ?? "seminovo");
  const [status, setStatus] = useState(product?.status ?? "available");
  const [categoryId, setCategoryId] = useState(product?.category_id ?? "");
  const [isFeatured, setIsFeatured] = useState(product?.is_featured ?? false);
  const [confirmDeactivateOpen, setConfirmDeactivateOpen] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [images, setImages] = useState<ProductImageInput[]>(
    () =>
      product?.product_images.map((image) => ({
        image_url: image.image_url,
        alt_text: image.alt_text,
      })) ?? [],
  );

  const slug = slugTouched ? slugManual : slugifyProductName(name);

  const boundAction = useMemo(() => {
    if (mode === "edit" && product) {
      return updateProductAction.bind(null, product.id);
    }
    return createProductAction;
  }, [mode, product]);

  const [state, formAction, isPending] = useActionState<
    ProductActionState,
    FormData
  >(boundAction, initialProductActionState);

  async function handleDeactivate() {
    if (!product) return;
    setIsDeactivating(true);
    try {
      await deactivateProductAction(product.id);
    } finally {
      setIsDeactivating(false);
      setConfirmDeactivateOpen(false);
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      <input type="hidden" name="size_group" value={sizeGroup} />
      <input type="hidden" name="gender" value={gender} />
      <input type="hidden" name="condition" value={condition} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="category_id" value={categoryId} />
      {isFeatured ? <input type="hidden" name="is_featured" value="on" /> : null}

      <Card>
        <CardHeader>
          <CardTitle>Dados da peça</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              name="name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
              placeholder="Ex.: Casaco moletom GAP azul"
              required
              aria-invalid={Boolean(state.fieldErrors?.name)}
            />
            <FieldError messages={state.fieldErrors?.name} />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="slug">Slug (URL)</Label>
            <Input
              id="slug"
              name="slug"
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlugManual(event.target.value);
              }}
              placeholder="casaco-moletom-gap-azul"
              required
              aria-invalid={Boolean(state.fieldErrors?.slug)}
            />
            <FieldError messages={state.fieldErrors?.slug} />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={product?.description ?? ""}
              placeholder="Medidas, marcas, observações da peça..."
              rows={4}
            />
            <FieldError messages={state.fieldErrors?.description} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="price">Preço (R$)</Label>
            <Input
              id="price"
              name="price"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              defaultValue={product?.price ?? ""}
              required
              aria-invalid={Boolean(state.fieldErrors?.price)}
            />
            <FieldError messages={state.fieldErrors?.price} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="compare_at_price">Preço riscado (opcional)</Label>
            <Input
              id="compare_at_price"
              name="compare_at_price"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              defaultValue={product?.compare_at_price ?? ""}
            />
            <FieldError messages={state.fieldErrors?.compare_at_price} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="brand">Marca</Label>
            <Input
              id="brand"
              name="brand"
              defaultValue={product?.brand ?? ""}
              placeholder="GAP, Zara, Carter's..."
            />
            <FieldError messages={state.fieldErrors?.brand} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="size_label">Tamanho</Label>
            <input type="hidden" name="size_label" value={sizeLabel} />
            <Select
              value={sizeLabel || undefined}
              onValueChange={(value) => {
                if (value && isProductSizeLabel(value)) {
                  setSizeLabel(value);
                }
              }}
            >
              <SelectTrigger
                id="size_label"
                size="sm"
                className="w-full"
                aria-invalid={Boolean(state.fieldErrors?.size_label)}
              >
                <SelectValue placeholder="P, M ou G" />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_SIZE_LABELS.map((label) => (
                  <SelectItem key={label} value={label}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError messages={state.fieldErrors?.size_label} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Grupo de tamanho</Label>
            <Select
              value={sizeGroup}
              onValueChange={(value) => {
                if (value) setSizeGroup(value as typeof sizeGroup);
              }}
            >
              <SelectTrigger
                size="sm"
                className="w-full"
                aria-invalid={Boolean(state.fieldErrors?.size_group)}
              >
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {SIZE_GROUPS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {SIZE_GROUP_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError messages={state.fieldErrors?.size_group} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Gênero</Label>
            <Select
              value={gender}
              onValueChange={(value) => {
                if (value) setGender(value as typeof gender);
              }}
            >
              <SelectTrigger size="sm" className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_GENDERS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {PRODUCT_GENDER_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError messages={state.fieldErrors?.gender} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Condição</Label>
            <Select
              value={condition}
              onValueChange={(value) => {
                if (value) setCondition(value as typeof condition);
              }}
            >
              <SelectTrigger size="sm" className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_CONDITIONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {PRODUCT_CONDITION_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError messages={state.fieldErrors?.condition} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(value) => {
                if (value) setStatus(value as typeof status);
              }}
            >
              <SelectTrigger size="sm" className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {PRODUCT_STATUS_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError messages={state.fieldErrors?.status} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quantity">Quantidade</Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              min={0}
              step={1}
              defaultValue={product?.quantity ?? 1}
              required
            />
            <p className="text-xs text-muted-foreground">
              Peça única = 1 (padrão do brechó).
            </p>
            <FieldError messages={state.fieldErrors?.quantity} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Categoria</Label>
            <Select
              value={categoryId || "none"}
              onValueChange={(value) => {
                setCategoryId(!value || value === "none" ? "" : value);
              }}
            >
              <SelectTrigger size="sm" className="w-full">
                <SelectValue placeholder="Sem categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem categoria</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError messages={state.fieldErrors?.category_id} />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
            <Input
              id="tags"
              name="tags"
              defaultValue={product?.tags?.join(", ") ?? ""}
              placeholder="inverno, casaco, moletom"
            />
            <FieldError messages={state.fieldErrors?.tags} />
          </div>

          <div className="flex items-center gap-2 sm:col-span-2">
            <Checkbox
              id="is_featured"
              checked={isFeatured}
              onCheckedChange={(checked) => setIsFeatured(checked === true)}
            />
            <Label htmlFor="is_featured" className="font-normal">
              Destacar na home / novidades
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fotos</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminProductImageManager
            images={images}
            onChange={setImages}
            disabled={isPending}
          />
        </CardContent>
      </Card>

      {state.error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {state.error}
        </p>
      ) : null}

      <Separator />

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending
            ? "Salvando..."
            : mode === "create"
              ? "Criar peça"
              : "Salvar alterações"}
        </Button>
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href="/admin/produtos">Cancelar</Link>
        </Button>
        {mode === "edit" && product?.staff_code ? (
          <>
            <Button type="button" variant="secondary" size="sm" asChild>
              <a
                href={productLabelPdfPath(product.id)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Imprimir Etiqueta
              </a>
            </Button>
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href={productLabelPrintPath(product.id)}>
                Imprimir térmica
              </Link>
            </Button>
          </>
        ) : null}
        {mode === "edit" && product && product.status !== "inactive" ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={isPending}
            onClick={() => setConfirmDeactivateOpen(true)}
          >
            Desativar
          </Button>
        ) : null}
      </div>
      {mode === "edit" && product?.staff_code ? (
        <p className="text-xs text-muted-foreground">
          Código de chão:{" "}
          <span className="font-semibold text-foreground">
            {product.staff_code}
          </span>
          . Etiqueta sem preço (PDF ou térmica).
        </p>
      ) : null}

      <Dialog open={confirmDeactivateOpen} onOpenChange={setConfirmDeactivateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desativar peça?</DialogTitle>
            <DialogDescription>
              A peça some do catálogo público, mas os dados continuam salvos — reative
              trocando o status depois, se precisar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeactivating}
              onClick={() => setConfirmDeactivateOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isDeactivating}
              onClick={() => void handleDeactivate()}
            >
              {isDeactivating ? "Desativando..." : "Desativar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
