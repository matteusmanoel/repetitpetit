"use client";

import { CheckCircle2, ChevronDown, Mic, Sparkles } from "lucide-react";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { AdminProductImageManager } from "@/components/admin/AdminProductImageManager";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  PRODUCT_SIZE_LABELS,
  PRODUCT_STATUS_LABELS,
  PRODUCT_STATUSES,
  SIZE_GROUP_LABELS,
  SIZE_GROUPS,
  coerceProductSizeLabel,
  isProductSizeLabel,
  slugifyProductName,
  type ProductCondition,
  type ProductGender,
  type ProductSizeLabel,
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
import { digitsOnly, reaisToCents } from "@/lib/br-masks";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  product: ProductWithImages | null;
  categories: CategoryOption[];
  onCategoriesChange: (categories: CategoryOption[]) => void;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
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
  loading = false,
}: Props) {
  const formKey = `${mode}-${product?.id ?? "new"}-${open ? "open" : "closed"}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[min(90vh,52rem)] w-full max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
        showCloseButton
      >
        <DialogHeader className="shrink-0 border-b border-border px-5 py-4 pr-12">
          <DialogTitle>
            {loading
              ? "Carregando peça…"
              : mode === "create"
                ? "Novo produto"
                : "Editar produto"}
          </DialogTitle>
          <DialogDescription>
            {loading
              ? "Buscando dados da peça."
              : "Grave áudio no topo para preencher campos. Detalhes opcionais no accordion."}
          </DialogDescription>
        </DialogHeader>

        {open && loading ? (
          <AdminProductDialogSkeleton />
        ) : open ? (
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

function AdminProductDialogSkeleton() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4"
      aria-busy="true"
      aria-label="Carregando formulário"
    >
      <div className="flex gap-2">
        <div className="h-11 flex-1 animate-pulse rounded-lg bg-muted" />
        <div className="h-11 flex-1 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="aspect-3/4 animate-pulse rounded-xl bg-muted" />
        <div className="flex flex-col gap-3">
          <div className="h-10 animate-pulse rounded-lg bg-muted" />
          <div className="h-10 animate-pulse rounded-lg bg-muted" />
          <div className="h-10 animate-pulse rounded-lg bg-muted" />
          <div className="h-10 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    </div>
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
  const [priceCents, setPriceCents] = useState<number | null>(() =>
    product?.price != null ? reaisToCents(Number(product.price)) : null,
  );
  const [compareAtCents, setCompareAtCents] = useState<number | null>(() =>
    product?.compare_at_price != null
      ? reaisToCents(Number(product.compare_at_price))
      : null,
  );
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [sizeLabel, setSizeLabel] = useState<ProductSizeLabel | "">(() =>
    product?.size_label && isProductSizeLabel(product.size_label)
      ? product.size_label
      : "",
  );
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
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [recording, setRecording] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [audioNote, setAudioNote] = useState<string | null>(null);
  const [audioSizeKb, setAudioSizeKb] = useState<number | null>(null);
  const [audioProcessed, setAudioProcessed] = useState(false);
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

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }
  }, [state.error]);

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
      setAudioProcessed(false);
      setAudioSizeKb(null);
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
        const kb =
          blob.size > 0 ? Math.max(1, Math.round(blob.size / 1024)) : null;
        setHasAudio(true);
        setAudioProcessed(false);
        setAudioSizeKb(kb);
        setAudioNote(
          kb != null ? `Áudio capturado (${kb} KB).` : "Áudio gravado.",
        );
        toast.success("Áudio gravado");
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setHasAudio(false);
      setAudioProcessed(false);
      setAudioSizeKb(null);
      toast.message("Gravando…", { description: "Toque de novo para parar" });
    } catch {
      setHasAudio(true);
      setAudioProcessed(false);
      setAudioSizeKb(null);
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
      setPriceCents(reaisToCents(fields.price));
      setBrand(fields.brand);
      setSizeLabel(coerceProductSizeLabel(fields.size_label));
      setSizeGroup(fields.size_group);
      setGender(fields.gender);
      setCondition(fields.condition);
      setAudioProcessed(true);

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
    <form
      action={formAction}
      className="flex min-h-0 flex-1 flex-col"
      noValidate
    >
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      <input type="hidden" name="size_group" value={sizeGroup} />
      <input type="hidden" name="gender" value={gender} />
      <input type="hidden" name="condition" value={condition} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="category_id" value={categoryId} />
      <input type="hidden" name="slug" value={slug} />
      {isFeatured ? <input type="hidden" name="is_featured" value="on" /> : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div className="mb-4 flex gap-2">
          <Button
            type="button"
            variant={
              recording ? "destructive" : hasAudio ? "secondary" : "outline"
            }
            className="h-11 min-w-0 flex-1 gap-2"
            onClick={() => void toggleRecord()}
            aria-pressed={recording}
            aria-live="polite"
          >
            {recording ? (
              <Mic className="size-4 shrink-0 animate-pulse" />
            ) : hasAudio && !audioProcessed ? (
              <CheckCircle2 className="size-4 shrink-0" />
            ) : (
              <Mic className="size-4 shrink-0" />
            )}
            <span className="truncate">
              {recording
                ? "Parar"
                : hasAudio
                  ? !audioProcessed && audioSizeKb != null
                    ? `Regravar (${audioSizeKb} KB)`
                    : "Regravar"
                  : "Gravar áudio"}
            </span>
          </Button>
          <Button
            type="button"
            className="h-11 min-w-0 flex-1 gap-2"
            disabled={!hasAudio || processingAudio}
            onClick={() => void handleProcessAudio()}
          >
            <Sparkles className="size-4 shrink-0" />
            {processingAudio ? "…" : "Processar"}
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
          <AdminProductImageManager
            images={images}
            onChange={setImages}
            disabled={isPending}
            compact
          />

          <div className="flex flex-col gap-4">
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
                <CurrencyInput
                  id="dialog-price"
                  name="price"
                  cents={priceCents}
                  onCentsChange={setPriceCents}
                  required
                  aria-invalid={Boolean(state.fieldErrors?.price)}
                />
                <FieldError messages={state.fieldErrors?.price} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dialog-size">Tamanho *</Label>
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
                    id="dialog-size"
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
                <Label>Categoria</Label>
                <Select
                  value={categoryId || "none"}
                  onValueChange={(value) => {
                    if (value === "__new__") {
                      setCreatingCat(true);
                      return;
                    }
                    setCreatingCat(false);
                    setCategoryId(!value || value === "none" ? "" : value);
                  }}
                >
                  <SelectTrigger className="w-full">
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
                      className="h-9 shrink-0 px-3"
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
                  <SelectTrigger className="w-full">
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

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="dialog-desc">Descrição</Label>
                <Textarea
                  id="dialog-desc"
                  name="description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  className="min-h-[4.5rem] resize-none"
                  placeholder="Medidas, marcas, observações…"
                />
                <FieldError messages={state.fieldErrors?.description} />
              </div>
            </div>

            <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex h-11 w-full items-center justify-between rounded-2xl border border-border bg-muted/40 px-4 text-left text-sm font-medium transition hover:bg-muted/60"
                >
                  Mais detalhes (opcional)
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-muted-foreground transition-transform",
                      detailsOpen && "rotate-180",
                    )}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent
                forceMount
                className={cn("overflow-hidden", !detailsOpen && "hidden")}
              >
                <div className="mt-3 space-y-4 rounded-2xl border border-border bg-card p-3 sm:p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="dialog-compare">Preço riscado</Label>
                      <CurrencyInput
                        id="dialog-compare"
                        name="compare_at_price"
                        cents={compareAtCents}
                        onCentsChange={setCompareAtCents}
                      />
                      <FieldError
                        messages={state.fieldErrors?.compare_at_price}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="dialog-qty">Quantidade</Label>
                      <Input
                        id="dialog-qty"
                        name="quantity"
                        type="text"
                        inputMode="numeric"
                        value={quantity}
                        onChange={(event) =>
                          setQuantity(
                            digitsOnly(event.target.value).slice(0, 4),
                          )
                        }
                      />
                      <FieldError messages={state.fieldErrors?.quantity} />
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
                        <SelectTrigger className="w-full">
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
                        <SelectTrigger className="w-full">
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
                        <SelectTrigger className="w-full">
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
                        onCheckedChange={(checked) =>
                          setIsFeatured(checked === true)
                        }
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
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        {state.error ? (
          <p
            role="alert"
            className="mt-3 text-sm font-medium text-destructive"
          >
            {state.error}
          </p>
        ) : null}
      </div>

      <DialogFooter className="mx-0 mb-0 shrink-0 gap-3 rounded-none border-t bg-card p-5 sm:flex-row sm:justify-stretch">
        <Button
          type="button"
          variant="outline"
          className="h-12 w-full flex-1"
          disabled={isPending}
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          className="h-12 w-full flex-1 bg-[var(--brand-green)] hover:bg-[var(--brand-green)]/90"
          disabled={isPending}
        >
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
