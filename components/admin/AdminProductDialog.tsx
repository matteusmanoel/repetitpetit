"use client";

/**
 * Dialog CRUD pontual — layout form-first (D144 / parity SessionDraftForm).
 */

import Image from "next/image";
import Link from "next/link";
import { Mic, Sparkles } from "lucide-react";
import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { AdminProductImageManager } from "@/components/admin/AdminProductImageManager";
import {
  ChipRow,
  ListPickButton,
  ProtoField,
  type PickOption,
} from "@/components/admin/intake-form-controls";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  activateProductAction,
  createProductAction,
  updateProductAction,
} from "@/features/admin/product-actions";
import {
  createCategoryInlineAction,
  processProductAudioAction,
} from "@/features/admin/product-dialog-actions";
import {
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
  initialProductActionState,
  type ProductActionState,
  type ProductImageInput,
} from "@/features/admin/product-schemas";
import type {
  CategoryOption,
  ProductWithImages,
} from "@/features/admin/product-types";
import { FEATURED_BRANDS } from "@/features/storefront/nav";
import { brandToast } from "@/lib/brand-toast";
import { digitsOnly, reaisToCents } from "@/lib/br-masks";
import {
  productLabelPdfPath,
  productLabelPrintPath,
} from "@/lib/qr/passport-url";
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

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("FileReader failed"));
    reader.readAsDataURL(blob);
  });
}

function formatMoneyFromCents(cents: number | null): string {
  if (cents == null || !Number.isFinite(cents)) return "";
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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
        className="flex h-[min(92dvh,52rem)] w-full max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        showCloseButton
      >
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
      className="flex min-h-0 flex-1 flex-col"
      aria-busy="true"
      aria-label="Carregando formulário"
    >
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        <div className="flex gap-2">
          <div className="h-12 flex-1 animate-pulse rounded-xl bg-muted" />
          <div className="h-12 flex-1 animate-pulse rounded-xl bg-muted" />
        </div>
        <div className="flex gap-3">
          <div className="h-36 w-[6.75rem] shrink-0 animate-pulse rounded-2xl bg-muted" />
          <div className="flex min-h-36 flex-1 flex-col gap-2">
            <div className="h-12 animate-pulse rounded-2xl bg-muted" />
            <div className="min-h-0 flex-1 animate-pulse rounded-2xl bg-muted" />
          </div>
        </div>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-12 w-full animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="flex shrink-0 gap-2 border-t border-border p-3">
        <div className="h-12 flex-1 animate-pulse rounded-xl bg-muted" />
        <div className="h-12 flex-1 animate-pulse rounded-xl bg-muted" />
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
  const [slugManual, setSlugManual] = useState(product?.slug ?? "");
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
  const [gender, setGender] = useState<ProductGender | null>(
    product?.gender ?? null,
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
  const [staffCode, setStaffCode] = useState(product?.staff_code ?? null);
  const [isActivating, setIsActivating] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [imagesOpen, setImagesOpen] = useState(false);

  const [creatingCat, setCreatingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [creatingCatPending, setCreatingCatPending] = useState(false);
  const [creatingBrand, setCreatingBrand] = useState(false);
  const [newBrand, setNewBrand] = useState("");

  const [recording, setRecording] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [audioDataUrl, setAudioDataUrl] = useState<string | null>(null);
  const [audioSizeKb, setAudioSizeKb] = useState<number | null>(null);
  const [audioProcessed, setAudioProcessed] = useState(false);
  const [processingAudio, setProcessingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const slug = slugTouched ? slugManual : slugifyProductName(name);
  const statusLocked = mode === "edit" && product?.status === "hold";
  const cover = images[0]?.image_url ?? null;

  const brandOptions = useMemo(() => {
    const fromDraft = brand.trim();
    return Array.from(
      new Set([...FEATURED_BRANDS, ...(fromDraft ? [fromDraft] : [])]),
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [brand]);

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
    if (state.error) brandToast.error(state.error);
  }, [state.error]);

  const canActivate =
    mode === "edit" &&
    product &&
    !staffCode &&
    (status === "available" || status === "inactive");

  async function handleActivate() {
    if (!product) return;
    setIsActivating(true);
    try {
      const result = await activateProductAction(product.id);
      if (!result.ok) {
        brandToast.error(result.error);
        return;
      }
      setStaffCode(result.staffCode);
      brandToast.success(`Peça ativada: ${result.staffCode}`);
      window.open(
        productLabelPdfPath(result.productId),
        "_blank",
        "noopener,noreferrer",
      );
    } finally {
      setIsActivating(false);
    }
  }

  async function handleCreateCategory() {
    const trimmed = newCatName.trim();
    if (!trimmed) {
      brandToast.error("Informe o nome da categoria.");
      return;
    }
    setCreatingCatPending(true);
    try {
      const result = await createCategoryInlineAction(trimmed);
      if (!result.ok) {
        brandToast.error(result.error);
        return;
      }
      onCategoriesChange([...categories, result.category]);
      setCategoryId(result.category.id);
      setNewCatName("");
      setCreatingCat(false);
      brandToast.success("Categoria criada");
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
      brandToast.error("Microfone indisponível neste navegador.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = [
        "audio/mp4",
        "audio/aac",
        "audio/webm;codecs=opus",
        "audio/webm",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        const kb =
          blob.size > 0 ? Math.max(1, Math.round(blob.size / 1024)) : null;
        void blobToDataUrl(blob)
          .then((dataUrl) => {
            setAudioDataUrl(dataUrl);
            setHasAudio(true);
            setAudioProcessed(false);
            setAudioSizeKb(kb);
            brandToast.success("Áudio gravado");
          })
          .catch(() => {
            brandToast.error("Falha ao ler o áudio gravado.");
          });
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setHasAudio(false);
      setAudioProcessed(false);
      setAudioDataUrl(null);
      setAudioSizeKb(null);
      brandToast.message("Gravando…", "Toque de novo para parar");
    } catch {
      brandToast.error("Permissão de microfone negada.");
    }
  }

  async function handleProcessAudio() {
    if (!hasAudio || !audioDataUrl || processingAudio) return;
    setProcessingAudio(true);
    brandToast.message("Processando áudio…", "STT + LLM");
    try {
      const currentCategoryName =
        categories.find((c) => c.id === categoryId)?.name ?? null;
      const result = await processProductAudioAction({
        audio_data_url: audioDataUrl,
        imageUrls: images.map((image) => image.image_url),
        current:
          mode === "edit"
            ? {
                name,
                description,
                price: priceCents != null ? priceCents / 100 : 0,
                brand,
                size_label: sizeLabel || "M",
                size_group: sizeGroup,
                gender: gender ?? "unissex",
                condition,
                category_id: categoryId || null,
                category_name: currentCategoryName,
                tags: tags
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              }
            : null,
      });
      if (!result.ok) {
        brandToast.error(result.error);
        return;
      }

      const { fields } = result;
      setName(fields.name);
      setSlugTouched(false);
      setDescription(fields.description);
      if (fields.price > 0) setPriceCents(reaisToCents(fields.price));
      setBrand(fields.brand);
      setSizeLabel(coerceProductSizeLabel(fields.size_label));
      setSizeGroup(fields.size_group);
      setGender(fields.gender);
      setCondition(fields.condition);
      if (fields.category_id) setCategoryId(fields.category_id);
      if (fields.tags?.length) setTags(fields.tags.join(", "));
      setAudioProcessed(true);

      if (result.mode === "ai" && !result.warning) {
        brandToast.success(
          mode === "edit" ? "Campos atualizados pela IA" : "Campos preenchidos pela IA",
        );
      } else if (result.warning) {
        brandToast.message(
          result.mode === "ai"
            ? mode === "edit"
              ? "Campos atualizados"
              : "Campos sugeridos"
            : mode === "edit"
              ? "Áudio não aplicado"
              : "Campos sugeridos",
          result.warning,
        );
      } else {
        brandToast.success(
          mode === "edit" ? "Campos atualizados" : "Campos preenchidos",
        );
      }
    } finally {
      setProcessingAudio(false);
    }
  }

  const genderOptions = PRODUCT_GENDERS.map((id) => ({
    id,
    label: PRODUCT_GENDER_LABELS[id],
  }));
  const sizeOptions = PRODUCT_SIZE_LABELS.map((id) => ({ id, label: id }));

  const categoryValueLabel = categoryId
    ? (categories.find((c) => c.id === categoryId)?.name ?? "Categoria")
    : "Sem categoria";

  const brandValueLabel = brand.trim() || "Sem marca";

  const categoryPickOptions: PickOption[] = [
    { id: "none", label: "Sem categoria" },
    ...categories.map((c) => ({ id: c.id, label: c.name })),
  ];

  const brandPickOptions: PickOption[] = [
    { id: "none", label: "Sem marca" },
    ...brandOptions.map((b) => ({ id: b, label: b })),
  ];

  const inputClass =
    "h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-base";

  return (
    <form
      action={formAction}
      className="flex min-h-0 flex-1 flex-col bg-zinc-100"
      noValidate
    >
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      <input type="hidden" name="size_group" value={sizeGroup} />
      <input type="hidden" name="gender" value={gender ?? "unissex"} />
      <input type="hidden" name="condition" value={condition} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="category_id" value={categoryId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="brand" value={brand} />
      <input type="hidden" name="name" value={name} />
      <input type="hidden" name="description" value={description} />
      <input
        type="hidden"
        name="price"
        value={priceCents != null ? String(priceCents / 100) : ""}
      />
      <input
        type="hidden"
        name="compare_at_price"
        value={compareAtCents != null ? String(compareAtCents / 100) : ""}
      />
      <input type="hidden" name="quantity" value={quantity} />
      <input type="hidden" name="tags" value={tags} />
      <input type="hidden" name="size_label" value={sizeLabel} />
      {isFeatured ? <input type="hidden" name="is_featured" value="on" /> : null}

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-3">
        {/* Voz */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant={
              recording ? "destructive" : hasAudio ? "secondary" : "outline"
            }
            className="h-12 min-w-0 flex-1 gap-2 rounded-xl text-base"
            onClick={() => void toggleRecord()}
            disabled={processingAudio || isPending}
          >
            <Mic className="size-4" />
            {recording
              ? "Parar"
              : hasAudio && audioSizeKb != null
                ? `Regravar (${audioSizeKb} KB)`
                : hasAudio
                  ? "Regravar"
                  : "Gravar"}
          </Button>
          <Button
            type="button"
            className="h-12 min-w-0 flex-1 gap-2 rounded-xl bg-[var(--brand-green)] text-base hover:bg-[var(--brand-green)]/90"
            onClick={() => void handleProcessAudio()}
            disabled={
              !hasAudio ||
              !audioDataUrl ||
              audioProcessed ||
              processingAudio ||
              recording ||
              isPending
            }
          >
            <Sparkles className="size-4" />
            {processingAudio
              ? "Processando…"
              : audioProcessed
                ? "Processado"
                : "Processar"}
          </Button>
        </div>

        {/* Thumb | Nome + Descrição */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setImagesOpen(true)}
            className="relative h-36 w-[6.75rem] shrink-0 overflow-hidden rounded-2xl bg-white ring-1 ring-black/5"
            aria-label="Gerenciar fotos"
          >
            {cover ? (
              <Image
                src={cover}
                alt={name || "Peça"}
                fill
                unoptimized
                className="object-cover"
                sizes="108px"
              />
            ) : (
              <span className="flex h-full items-center justify-center px-2 text-center text-xs text-muted-foreground">
                Toque para foto
              </span>
            )}
            {images.length > 1 ? (
              <span className="absolute bottom-1 right-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {images.length}
              </span>
            ) : null}
          </button>
          <div className="flex min-h-36 min-w-0 flex-1 flex-col gap-2">
            <Input
              value={name}
              placeholder="Nome *"
              aria-label="Nome"
              className={cn(inputClass, "shrink-0")}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlugManual(slugifyProductName(e.target.value));
              }}
            />
            <FieldError messages={state.fieldErrors?.name} />
            <Textarea
              value={description}
              placeholder="Descrição"
              aria-label="Descrição"
              className="min-h-0 flex-1 resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-base"
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-[6.75rem_1fr] gap-3">
          <ProtoField label="Preço *">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-sm font-medium">
                R$
              </span>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="0,00"
                aria-label="Preço"
                value={formatMoneyFromCents(priceCents)}
                className={cn(inputClass, "pl-10")}
                onChange={(e) => {
                  const digits = digitsOnly(e.target.value);
                  setPriceCents(digits ? Number(digits) : null);
                }}
              />
            </div>
            <FieldError messages={state.fieldErrors?.price} />
          </ProtoField>
          <ProtoField label="Tamanho">
            <ChipRow
              justified
              options={sizeOptions}
              value={sizeLabel || null}
              onChange={(size) => setSizeLabel(size)}
            />
            <FieldError messages={state.fieldErrors?.size_label} />
          </ProtoField>
        </div>

        <div className="grid grid-cols-[1fr_auto] items-end gap-3">
          <ProtoField label="Sexo">
            <ChipRow
              justified
              options={genderOptions}
              value={gender}
              onChange={(g) => setGender(g)}
            />
          </ProtoField>
          <ProtoField label="Condição" className="w-[6.75rem]">
            <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-3">
              <input
                type="checkbox"
                className="size-5 accent-[var(--brand-green)]"
                checked={condition === "novo"}
                onChange={(e) =>
                  setCondition(e.target.checked ? "novo" : "seminovo")
                }
              />
              <span className="text-sm font-semibold">Novo</span>
            </label>
          </ProtoField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ProtoField label="Marca">
            <ListPickButton
              label="Marca"
              valueLabel={brandValueLabel}
              options={brandPickOptions}
              createLabel="Criar marca"
              onCreate={() => {
                setNewBrand("");
                setCreatingBrand(true);
              }}
              onChange={(value) => {
                setBrand(value === "none" ? "" : value);
              }}
            />
          </ProtoField>
          <ProtoField label="Categoria">
            <ListPickButton
              label="Categoria"
              valueLabel={categoryValueLabel}
              options={categoryPickOptions}
              createLabel="Criar categoria"
              onCreate={() => {
                setNewCatName("");
                setCreatingCat(true);
              }}
              onChange={(value) => {
                setCategoryId(value === "none" ? "" : value);
              }}
            />
          </ProtoField>
        </div>

        {mode === "edit" ? (
          <ProtoField label="Status">
            <ListPickButton
              label="Status"
              valueLabel={PRODUCT_STATUS_LABELS[status]}
              options={PRODUCT_STATUSES.filter((s) =>
                statusLocked ? s === status : true,
              ).map((s) => ({ id: s, label: PRODUCT_STATUS_LABELS[s] }))}
              onChange={(value) => {
                if (!statusLocked) setStatus(value as ProductStatus);
              }}
            />
          </ProtoField>
        ) : null}

        <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex h-11 w-full items-center justify-between rounded-xl bg-white px-4 text-sm font-medium ring-1 ring-black/10"
            >
              Mais detalhes
              <span className="text-xs text-muted-foreground">
                {detailsOpen ? "ocultar" : "mostrar"}
              </span>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <ProtoField label="Preço riscado">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium">
                    R$
                  </span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    className={cn(inputClass, "pl-10")}
                    value={formatMoneyFromCents(compareAtCents)}
                    onChange={(e) => {
                      const digits = digitsOnly(e.target.value);
                      setCompareAtCents(digits ? Number(digits) : null);
                    }}
                  />
                </div>
              </ProtoField>
              <ProtoField label="Qtd">
                <Input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </ProtoField>
            </div>
            <ProtoField label="Grupo de tamanho">
              <ListPickButton
                label="Grupo"
                valueLabel={SIZE_GROUP_LABELS[sizeGroup]}
                options={SIZE_GROUPS.map((g) => ({
                  id: g,
                  label: SIZE_GROUP_LABELS[g],
                }))}
                onChange={(value) => setSizeGroup(value as SizeGroup)}
              />
            </ProtoField>
            <ProtoField label="Tags">
              <Input
                className={inputClass}
                value={tags}
                placeholder="rosa, moletom…"
                onChange={(e) => setTags(e.target.value)}
              />
            </ProtoField>
            <ProtoField label="Slug">
              <Input
                className={inputClass}
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlugManual(e.target.value);
                }}
              />
            </ProtoField>
            <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-black/5">
              <input
                type="checkbox"
                className="size-5 accent-[var(--brand-green)]"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
              />
              <span className="text-sm font-medium">Destaque na vitrine</span>
            </label>
          </CollapsibleContent>
        </Collapsible>

        {mode === "edit" && product ? (
          <div className="space-y-2 rounded-2xl bg-white p-3 ring-1 ring-black/5">
            {staffCode ? (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm font-semibold">{staffCode}</span>
                <Link
                  href={productLabelPrintPath(product.id)}
                  className="text-sm font-medium text-[var(--brand-green)] underline"
                  target="_blank"
                >
                  Imprimir etiqueta
                </Link>
              </div>
            ) : canActivate ? (
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-xl"
                disabled={isActivating}
                onClick={() => void handleActivate()}
              >
                {isActivating ? "Ativando…" : "Ativar peça (gerar RP)"}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t border-black/5 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button
          type="button"
          variant="outline"
          className="h-12 flex-1 rounded-xl text-base"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          className="h-12 flex-1 rounded-xl bg-[var(--brand-green)] text-base hover:bg-[var(--brand-green)]/90"
          disabled={isPending}
        >
          {isPending ? "Salvando…" : "Salvar"}
        </Button>
      </div>

      {/* Gestão multi-imagem */}
      <Dialog open={imagesOpen} onOpenChange={setImagesOpen}>
        <DialogContent className="z-[120] max-h-[85dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Fotos da peça</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            A primeira imagem é a capa. Arraste para reordenar.
          </p>
          <AdminProductImageManager images={images} onChange={setImages} />
          <DialogFooter>
            <Button
              type="button"
              className="h-11"
              onClick={() => setImagesOpen(false)}
            >
              Pronto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nova marca */}
      <Dialog
        open={creatingBrand}
        onOpenChange={(open) => {
          setCreatingBrand(open);
          if (!open) setNewBrand("");
        }}
      >
        <DialogContent className="z-[120] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova marca</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Nome da marca"
            value={newBrand}
            className={inputClass}
            onChange={(e) => setNewBrand(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const trimmed = newBrand.trim();
                if (!trimmed) {
                  brandToast.error("Informe o nome da marca.");
                  return;
                }
                setBrand(trimmed);
                setCreatingBrand(false);
                setNewBrand("");
              }
            }}
          />
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => setCreatingBrand(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="h-11 bg-[var(--brand-green)] hover:bg-[var(--brand-green)]/90"
              onClick={() => {
                const trimmed = newBrand.trim();
                if (!trimmed) {
                  brandToast.error("Informe o nome da marca.");
                  return;
                }
                setBrand(trimmed);
                setCreatingBrand(false);
                setNewBrand("");
              }}
            >
              Usar marca
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nova categoria */}
      <Dialog
        open={creatingCat}
        onOpenChange={(open) => {
          if (creatingCatPending) return;
          setCreatingCat(open);
          if (!open) setNewCatName("");
        }}
      >
        <DialogContent className="z-[120] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova categoria</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="Nome da categoria"
            value={newCatName}
            disabled={creatingCatPending}
            className={inputClass}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleCreateCategory();
              }
            }}
          />
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={creatingCatPending}
              onClick={() => setCreatingCat(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="h-11 bg-[var(--brand-green)] hover:bg-[var(--brand-green)]/90"
              disabled={creatingCatPending}
              onClick={() => void handleCreateCategory()}
            >
              {creatingCatPending ? "Criando…" : "Criar categoria"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
