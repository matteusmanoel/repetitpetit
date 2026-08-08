"use client";

import { Mic, Sparkles } from "lucide-react";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { AdminProductImageManager } from "@/components/admin/AdminProductImageManager";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import {
  createCategoryInlineAction,
  processProductAudioAction,
} from "@/features/admin/product-dialog-actions";
import {
  PRODUCT_CONDITION_LABELS,
  PRODUCT_CONDITIONS,
  PRODUCT_GENDER_LABELS,
  PRODUCT_GENDERS,
  PRODUCT_STATUS_LABELS,
  PRODUCT_STATUSES,
  SIZE_GROUP_LABELS,
  SIZE_GROUPS,
  slugifyProductName,
  type ProductCondition,
  type ProductGender,
  type ProductStatus,
  type SizeGroup,
} from "@/features/admin/product-constants";
import {
  createProductAction,
  updateProductAction,
} from "@/features/admin/product-actions";
import {
  initialProductActionState,
  type ProductActionState,
  type ProductImageInput,
} from "@/features/admin/product-schemas";
import type {
  CategoryOption,
  ProductWithImages,
} from "@/features/admin/product-types";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  product: ProductWithImages | null;
  categories: CategoryOption[];
  onCategoriesChange: (categories: CategoryOption[]) => void;
  onOpenChange: (open: boolean) => void;
};

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p className="text-xs text-destructive" role="alert">
      {messages[0]}
    </p>
  );
}

export function AdminProductDialog({
  open,
  mode,
  product,
  categories,
  onCategoriesChange,
  onOpenChange,
}: Props) {
  const formKey = `${mode}-${product?.id ?? "new"}-${open ? "open" : "closed"}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[92vh] w-full max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
        showCloseButton
      >
        <DialogHeader className="shrink-0 border-b border-border px-5 py-4 pr-12">
          <DialogTitle>
            {mode === "create" ? "Novo produto" : "Editar produto"}
          </DialogTitle>
          <DialogDescription>
            Categoria e status lado a lado · várias fotos · áudio preenche campos
          </DialogDescription>
        </DialogHeader>

        {open ? (
          <AdminProductDialogForm
            key={formKey}
            mode={mode}
            product={product}
            categories={categories}
            onCategoriesChange={onCategoriesChange}
            onCancel={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function AdminProductDialogForm({
  mode,
  product,
  categories,
  onCategoriesChange,
  onCancel,
}: {
  mode: "create" | "edit";
  product: ProductWithImages | null;
  categories: CategoryOption[];
  onCategoriesChange: (categories: CategoryOption[]) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(product?.name ?? "");
  const [slugManual] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(
    product?.price != null ? String(product.price) : "",
  );
  const [compareAtPrice, setCompareAtPrice] = useState(
    product?.compare_at_price != null ? String(product.compare_at_price) : "",
  );
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [sizeLabel, setSizeLabel] = useState(product?.size_label ?? "");
  const [sizeGroup, setSizeGroup] = useState<SizeGroup>(
    product?.size_group ?? "2_3a",
  );
  const [gender, setGender] = useState<ProductGender>(
    product?.gender ?? "unissex",
  );
  const [condition, setCondition] = useState<ProductCondition>(
    product?.condition ?? "seminovo",
  );
  const [status, setStatus] = useState<ProductStatus>(
    product?.status ?? "available",
  );
  const [categoryId, setCategoryId] = useState(product?.category_id ?? "");
  const [isFeatured, setIsFeatured] = useState(product?.is_featured ?? false);
  const [tags, setTags] = useState(product?.tags?.join(", ") ?? "");
  const [quantity, setQuantity] = useState(String(product?.quantity ?? 1));
  const [images, setImages] = useState<ProductImageInput[]>(
    () =>
      product?.product_images.map((image) => ({
        image_url: image.image_url,
        alt_text: image.alt_text,
      })) ?? [],
  );

  const [creatingCat, setCreatingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [creatingCatPending, setCreatingCatPending] = useState(false);

  const [recording, setRecording] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [audioNote, setAudioNote] = useState<string | null>(null);
  const [processingAudio, setProcessingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const slug = slugTouched ? slugManual : slugifyProductName(name);
  const statusLocked = mode === "edit" && product?.status === "hold";

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

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  async function handleCreateCategory() {
    const trimmed = newCatName.trim();
    if (!trimmed) {
      toast.error("Informe o nome da categoria.");
      return;
    }
    setCreatingCatPending(true);
    try {
      const result = await createCategoryInlineAction(trimmed);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onCategoriesChange([...categories, result.category]);
      setCategoryId(result.category.id);
      setNewCatName("");
      setCreatingCat(false);
      toast.success("Categoria criada");
    } finally {
      setCreatingCatPending(false);
    }
  }

  async function toggleRecord() {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setHasAudio(true);
      setAudioNote("Áudio gravado (mock — microfone indisponível).");
      toast.success("Áudio gravado (mock)");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setHasAudio(true);
        setAudioNote(
          blob.size > 0
            ? `Áudio capturado (${Math.round(blob.size / 1024)} KB).`
            : "Áudio gravado.",
        );
        toast.success("Áudio gravado");
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setHasAudio(false);
      toast.message("Gravando…", { description: "Toque de novo para parar" });
    } catch {
      setHasAudio(true);
      setAudioNote("Áudio gravado (mock — permissão negada).");
      toast.success("Áudio gravado (mock)");
    }
  }

  async function handleProcessAudio() {
    if (!hasAudio || processingAudio) return;
    setProcessingAudio(true);
    toast.message("Processando áudio…", { description: "Gerando campos" });
    try {
      const result = await processProductAudioAction({
        audioNote,
        imageUrls: images.map((image) => image.image_url),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      const { fields } = result;
      setName(fields.name);
      setSlugTouched(false);
      setDescription(fields.description);
      setPrice(String(fields.price));
      setBrand(fields.brand);
      setSizeLabel(fields.size_label);
      setSizeGroup(fields.size_group);
      setGender(fields.gender);
      setCondition(fields.condition);

      if (result.warning) {
        toast.message("Campos preenchidos", { description: result.warning });
      } else {
        toast.success("Campos preenchidos pelo áudio");
      }
    } finally {
      setProcessingAudio(false);
    }
  }

  return (
    <form action={formAction} className="flex min-h-0 flex-1 flex-col" noValidate>
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      <input type="hidden" name="size_group" value={sizeGroup} />
      <input type="hidden" name="gender" value={gender} />
      <input type="hidden" name="condition" value={condition} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="category_id" value={categoryId} />
      <input type="hidden" name="slug" value={slug} />
      {isFeatured ? <input type="hidden" name="is_featured" value="on" /> : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div className="grid gap-5 sm:grid-cols-[13rem_1fr]">
          <div className="space-y-3 sm:self-start">
            <AdminProductImageManager
              images={images}
              onChange={setImages}
              disabled={isPending}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant={recording ? "destructive" : hasAudio ? "secondary" : "outline"}
                size="sm"
                className="h-8 flex-1"
                onClick={() => void toggleRecord()}
                aria-pressed={recording}
              >
                <Mic className={recording ? "animate-pulse" : undefined} />
                {recording ? "Parar" : hasAudio ? "Regravar" : "Áudio"}
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 flex-1"
                disabled={!hasAudio || processingAudio}
                onClick={() => void handleProcessAudio()}
              >
                <Sparkles />
                {processingAudio ? "…" : "Processar"}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Áudio + Processar preenche os campos (IA ou fallback manual).
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="dialog-name">Nome *</Label>
              <Input
                id="dialog-name"
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex.: Casaco moletom GAP azul"
                required
                aria-invalid={Boolean(state.fieldErrors?.name)}
              />
              <FieldError messages={state.fieldErrors?.name} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dialog-price">Preço (R$) *</Label>
              <Input
                id="dialog-price"
                name="price"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                required
                aria-invalid={Boolean(state.fieldErrors?.price)}
              />
              <FieldError messages={state.fieldErrors?.price} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dialog-compare">Preço riscado</Label>
              <Input
                id="dialog-compare"
                name="compare_at_price"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                value={compareAtPrice}
                onChange={(event) => setCompareAtPrice(event.target.value)}
              />
              <FieldError messages={state.fieldErrors?.compare_at_price} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dialog-size">Tamanho *</Label>
              <Input
                id="dialog-size"
                name="size_label"
                value={sizeLabel}
                onChange={(event) => setSizeLabel(event.target.value)}
                placeholder="2 anos, P, 12-18m..."
                required
                aria-invalid={Boolean(state.fieldErrors?.size_label)}
              />
              <FieldError messages={state.fieldErrors?.size_label} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dialog-brand">Marca</Label>
              <Input
                id="dialog-brand"
                name="brand"
                value={brand}
                onChange={(event) => setBrand(event.target.value)}
                placeholder="GAP, Zara, Carter's..."
              />
              <FieldError messages={state.fieldErrors?.brand} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Grupo de tamanho</Label>
              <Select
                value={sizeGroup}
                onValueChange={(value) => {
                  if (value) setSizeGroup(value as SizeGroup);
                }}
              >
                <SelectTrigger className="w-full" size="sm">
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
                  if (value) setGender(value as ProductGender);
                }}
              >
                <SelectTrigger className="w-full" size="sm">
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
                  if (value) setCondition(value as ProductCondition);
                }}
              >
                <SelectTrigger className="w-full" size="sm">
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
              <Label htmlFor="dialog-qty">Quantidade</Label>
              <Input
                id="dialog-qty"
                name="quantity"
                type="number"
                min={0}
                step={1}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
              <FieldError messages={state.fieldErrors?.quantity} />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:col-span-2">
              <div className="flex flex-col gap-1.5">
                <Label>Categoria</Label>
                <Select
                  value={categoryId || "none"}
                  onValueChange={(value) => {
                    if (value === "__new__") {
                      setCreatingCat(true);
                      return;
                    }
                    setCategoryId(!value || value === "none" ? "" : value);
                  }}
                >
                  <SelectTrigger className="w-full" size="sm">
                    <SelectValue placeholder="Sem categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem categoria</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="__new__">+ Criar categoria…</SelectItem>
                  </SelectContent>
                </Select>
                {creatingCat ? (
                  <div className="mt-1 flex gap-2">
                    <Input
                      placeholder="Nome da categoria"
                      value={newCatName}
                      onChange={(event) => setNewCatName(event.target.value)}
                      disabled={creatingCatPending}
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 shrink-0"
                      disabled={creatingCatPending}
                      onClick={() => void handleCreateCategory()}
                    >
                      {creatingCatPending ? "…" : "Criar"}
                    </Button>
                  </div>
                ) : null}
                <FieldError messages={state.fieldErrors?.category_id} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Status</Label>
                <Select
                  value={status}
                  disabled={statusLocked}
                  onValueChange={(value) => {
                    if (value) setStatus(value as ProductStatus);
                  }}
                >
                  <SelectTrigger className="w-full" size="sm">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_STATUSES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {PRODUCT_STATUS_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {statusLocked ? (
                  <p className="text-[11px] text-muted-foreground">
                    Hold é gerenciado pela reserva — use Override na listagem.
                  </p>
                ) : null}
                <FieldError messages={state.fieldErrors?.status} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="dialog-desc">Descrição</Label>
              <Textarea
                id="dialog-desc"
                name="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                placeholder="Medidas, marcas, observações…"
              />
              <FieldError messages={state.fieldErrors?.description} />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="dialog-tags">Tags (vírgula)</Label>
              <Input
                id="dialog-tags"
                name="tags"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="inverno, casaco, moletom"
              />
              <FieldError messages={state.fieldErrors?.tags} />
            </div>

            <div className="flex items-center gap-2 sm:col-span-2">
              <Checkbox
                id="dialog-featured"
                checked={isFeatured}
                onCheckedChange={(checked) => setIsFeatured(checked === true)}
              />
              <Label htmlFor="dialog-featured" className="font-normal">
                Destacar na home / novidades
              </Label>
            </div>

            <p className="text-xs text-muted-foreground sm:col-span-2">
              Slug: <span className="font-mono">{slug || "—"}</span>
            </p>
          </div>
        </div>

        {state.error ? (
          <p role="alert" className="mt-4 text-sm font-medium text-destructive">
            {state.error}
          </p>
        ) : null}
      </div>

      <DialogFooter className="shrink-0 sm:justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          disabled={isPending}
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button type="submit" size="sm" className="h-8" disabled={isPending}>
          {isPending
            ? "Salvando..."
            : mode === "create"
              ? "Criar peça"
              : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
