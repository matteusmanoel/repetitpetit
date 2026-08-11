"use client";

/**
 * Preview editável do cadastro em massa — layout form-first (protótipo A / D143).
 */

import Image from "next/image";
import {
  Camera,
  FileAudio,
  List,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { brandToast } from "@/lib/brand-toast";

import {
  ChipRow,
  ListPickButton,
  ProtoField,
  type PickOption,
} from "@/components/admin/intake-form-controls";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { validateIntakeDraft } from "@/features/admin/ai-intake/business-validator";
import { evaluatePublishGate } from "@/features/admin/ai-intake/category-match";
import type { IntakeDraftItem } from "@/features/admin/ai-intake/schemas";
import {
  PRODUCT_GENDER_LABELS,
  PRODUCT_GENDERS,
  PRODUCT_SIZE_LABELS,
  isProductSizeLabel,
  slugifyProductName,
  type ProductGender,
  type ProductSizeLabel,
} from "@/features/admin/product-constants";
import { createCategoryInlineAction } from "@/features/admin/product-dialog-actions";
import type { CategoryOption } from "@/features/admin/product-types";
import { FEATURED_BRANDS } from "@/features/storefront/nav";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

function coerceMoney(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const n = Number(value.replace(",", ".").trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function formatMoneyDisplay(value: unknown): string {
  const n = coerceMoney(value);
  if (n === null) return "";
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function moneyFromDigitString(raw: string): number | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  return Number(digits) / 100;
}

export function SessionDraftForm({
  draft,
  categories,
  publish,
  pieceIndex,
  seriesTotal,
  onChange,
  onCategoriesChange,
  onPublishChange,
  onBackToRecord,
  onOpenSeries,
  onRequestRemove,
  aiDebug,
}: {
  draft: IntakeDraftItem;
  categories: CategoryOption[];
  publish: boolean;
  pieceIndex: number;
  seriesTotal: number;
  onChange: (patch: Partial<IntakeDraftItem>) => void;
  onCategoriesChange: (next: CategoryOption[]) => void;
  onPublishChange: (publish: boolean) => void;
  onBackToRecord: () => void;
  onOpenSeries: () => void;
  onRequestRemove: (clientId: string) => void;
  aiDebug: {
    transcript: string | null;
    llm_user_text?: string;
    llm_raw?: string;
  } | null;
}) {
  const [creatingBrand, setCreatingBrand] = useState(false);
  const [newBrand, setNewBrand] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [creatingCatPending, setCreatingCatPending] = useState(false);
  const [showGateErrors, setShowGateErrors] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);

  const brandOptions = useMemo(() => {
    const fromDraft = draft.brand?.trim();
    return Array.from(
      new Set([...FEATURED_BRANDS, ...(fromDraft ? [fromDraft] : [])]),
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [draft.brand]);

  const cover = draft.images[0]?.image_url ?? null;
  const conflicts = validateIntakeDraft(draft);
  const hasConflict = conflicts.length > 0;
  const gate = evaluatePublishGate({
    name: draft.name,
    price: draft.price,
    size_label: draft.size_label,
    images: draft.images,
    hasConflict,
  });

  const priceValue =
    typeof draft.price === "string"
      ? Number(draft.price.replace(",", "."))
      : draft.price;
  const nameMissing = draft.name.trim().length < 2;
  const priceMissing = !(
    typeof priceValue === "number" &&
    Number.isFinite(priceValue) &&
    priceValue > 0
  );
  const sizeMissing = !draft.size_label.trim();
  const photoMissing = !cover;

  const fieldError = (missing: boolean) =>
    showGateErrors && missing
      ? "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/30"
      : undefined;

  useEffect(() => {
    if (!photoOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [photoOpen]);

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
      onChange({
        category_id: result.category.id,
        category_name: result.category.name,
      });
      setNewCatName("");
      setCreatingCat(false);
      brandToast.success("Categoria criada");
    } finally {
      setCreatingCatPending(false);
    }
  }

  const pendingCategoryName = draft.category_name?.trim() || null;
  const categoryValueLabel = draft.category_id
    ? (categories.find((c) => c.id === draft.category_id)?.name ??
      pendingCategoryName ??
      "Categoria")
    : pendingCategoryName
      ? `${pendingCategoryName} (nova)`
      : "Sem categoria";

  const brandValueLabel = draft.brand?.trim() || "Sem marca";

  const sizeValue = isProductSizeLabel(draft.size_label)
    ? draft.size_label
    : null;

  const genderOptions = PRODUCT_GENDERS.map((id) => ({
    id,
    label: PRODUCT_GENDER_LABELS[id],
  }));

  const sizeOptions = PRODUCT_SIZE_LABELS.map((id) => ({
    id,
    label: id,
  }));

  const categoryPickOptions: PickOption[] = [
    { id: "none", label: "Sem categoria" },
    ...(pendingCategoryName && !draft.category_id
      ? [{ id: "__pending__", label: `${pendingCategoryName} (nova)` }]
      : []),
    ...categories.map((c) => ({ id: c.id, label: c.name })),
  ];

  const brandPickOptions: PickOption[] = [
    { id: "none", label: "Sem marca" },
    ...brandOptions.map((b) => ({ id: b, label: b })),
  ];

  const inputClass = "h-12 text-base rounded-2xl";

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-lg flex-col overflow-hidden bg-zinc-100 text-foreground">
      <header className="flex shrink-0 items-center justify-between gap-2 px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">
            Preview · {pieceIndex}/{seriesTotal}
          </p>
          <h1 className="truncate text-lg font-semibold">Revisar peça</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {aiDebug?.transcript ? (
            <button
              type="button"
              onClick={() => setDebugOpen(true)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-medium ring-1 ring-black/10"
              aria-label="Ver transcrição STT"
            >
              <FileAudio className="size-4" />
              STT
            </button>
          ) : null}
          {seriesTotal > 0 ? (
            <button
              type="button"
              onClick={onOpenSeries}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-medium ring-1 ring-black/10"
              aria-label="Lista da série"
            >
              <List className="size-4" />
              Série
            </button>
          ) : null}
          <button
            type="button"
            onClick={onBackToRecord}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-medium ring-1 ring-black/10"
            aria-label="Voltar para gravação"
          >
            <Camera className="size-4" />
            Refazer
          </button>
          <button
            type="button"
            onClick={() => onRequestRemove(draft.client_id)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[var(--brand-pink)] ring-1 ring-black/10"
            aria-label="Remover peça da série"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </header>

      {/* Thumb | Nome + Descrição */}
      <div className="flex shrink-0 gap-3 px-4 pb-3">
        <button
          type="button"
          onClick={() => cover && setPhotoOpen(true)}
          className={cn(
            "relative h-36 w-[6.75rem] shrink-0 overflow-hidden rounded-2xl bg-white ring-1",
            fieldError(photoMissing) ?? "ring-black/5",
          )}
          aria-label="Ampliar foto"
          disabled={!cover}
        >
          {cover ? (
            <Image
              src={cover}
              alt={draft.name || "Peça"}
              fill
              unoptimized
              className="object-cover"
              sizes="108px"
            />
          ) : (
            <span className="flex h-full items-center justify-center text-xs text-muted-foreground">
              Sem foto
            </span>
          )}
        </button>
        <div className="flex min-h-36 min-w-0 flex-1 flex-col gap-2">
          <Input
            value={draft.name}
            placeholder="Nome *"
            aria-label="Nome"
            className={cn(inputClass, "shrink-0", fieldError(nameMissing))}
            aria-invalid={showGateErrors && nameMissing}
            onChange={(event) => {
              const name = event.target.value;
              onChange({ name, slug: slugifyProductName(name) });
            }}
          />
          <Textarea
            value={draft.description ?? ""}
            placeholder="Descrição"
            aria-label="Descrição"
            className="min-h-0 flex-1 resize-none rounded-2xl text-base"
            onChange={(event) =>
              onChange({ description: event.target.value || null })
            }
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 pb-4">
        {hasConflict ? (
          <p className="text-xs text-amber-700" role="status">
            ⚠ {conflicts[0]?.message}
          </p>
        ) : null}

        <div className="grid grid-cols-[6.75rem_1fr] gap-3">
          <ProtoField label="Preço *">
            <div className="relative">
              <span
                className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-sm font-medium"
                aria-hidden
              >
                R$
              </span>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="0,00"
                aria-label="Preço"
                value={formatMoneyDisplay(draft.price)}
                className={cn(inputClass, "pl-10", fieldError(priceMissing))}
                aria-invalid={showGateErrors && priceMissing}
                onChange={(event) => {
                  onChange({ price: moneyFromDigitString(event.target.value) });
                }}
              />
            </div>
          </ProtoField>
          <ProtoField label="Tamanho">
            <ChipRow
              justified
              options={sizeOptions}
              value={sizeValue}
              onChange={(size: ProductSizeLabel) =>
                onChange({ size_label: size })
              }
            />
            {showGateErrors && sizeMissing ? (
              <span className="text-[11px] text-red-600">Selecione</span>
            ) : null}
          </ProtoField>
        </div>

        <div className="grid grid-cols-[1fr_auto] items-end gap-3">
          <ProtoField label="Sexo">
            <ChipRow
              justified
              options={genderOptions}
              value={draft.gender}
              onChange={(gender: ProductGender) => onChange({ gender })}
            />
          </ProtoField>
          <ProtoField label="Condição" className="w-[6.75rem]">
            <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-3">
              <input
                type="checkbox"
                className="size-5 accent-[var(--brand-green)]"
                checked={draft.condition === "novo"}
                onChange={(e) =>
                  onChange({
                    condition: e.target.checked ? "novo" : "seminovo",
                  })
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
                onChange({ brand: value === "none" ? null : value });
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
                setNewCatName(pendingCategoryName ?? "");
                setCreatingCat(true);
              }}
              onChange={(value) => {
                if (value === "none") {
                  onChange({ category_id: null, category_name: null });
                  return;
                }
                if (value === "__pending__") {
                  onChange({
                    category_id: null,
                    category_name: pendingCategoryName,
                  });
                  return;
                }
                const selected = categories.find((c) => c.id === value);
                onChange({
                  category_id: value,
                  category_name: selected?.name ?? null,
                });
              }}
            />
          </ProtoField>
        </div>

        <button
          type="button"
          className={cn(
            "flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left",
            gate.ok
              ? "border-[var(--brand-green)]/30 bg-[var(--brand-green)]/5"
              : "border-black/10 bg-white",
          )}
          onClick={() => {
            if (!gate.ok) {
              setShowGateErrors(true);
              brandToast.message("Preencha os campos em vermelho");
              return;
            }
            setShowGateErrors(false);
            onPublishChange(!publish);
          }}
          aria-pressed={publish}
        >
          <span
            className={cn(
              "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border",
              publish && gate.ok
                ? "border-[var(--brand-green)] bg-[var(--brand-green)] text-white"
                : "border-muted-foreground/40 bg-white",
            )}
            aria-hidden
          >
            {publish && gate.ok ? <Check className="size-3.5" /> : null}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium">
              Publicar no catálogo
            </span>
            {gate.ok ? (
              <span className="block text-[11px] text-muted-foreground">
                Produto entra como disponível.
              </span>
            ) : null}
          </span>
        </button>
      </div>

      {/* Dialogs */}
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
            onChange={(event) => setNewBrand(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                const trimmed = newBrand.trim();
                if (!trimmed) {
                  brandToast.error("Informe o nome da marca.");
                  return;
                }
                onChange({ brand: trimmed });
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
              onClick={() => {
                setCreatingBrand(false);
                setNewBrand("");
              }}
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
                onChange({ brand: trimmed });
                setCreatingBrand(false);
                setNewBrand("");
              }}
            >
              Usar marca
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            onChange={(event) => setNewCatName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
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
              onClick={() => {
                setCreatingCat(false);
                setNewCatName("");
              }}
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

      <Dialog open={debugOpen} onOpenChange={setDebugOpen}>
        <DialogContent className="z-[120] max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Debug STT / LLM</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 text-sm">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Transcrição
              </p>
              <pre className="whitespace-pre-wrap rounded-xl bg-muted/60 p-3 text-[13px] leading-relaxed">
                {aiDebug?.transcript || "—"}
              </pre>
            </div>
            {aiDebug?.llm_user_text ? (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Prompt enviado ao LLM
                </p>
                <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-xl bg-muted/60 p-3 text-[12px] leading-relaxed">
                  {aiDebug.llm_user_text}
                </pre>
              </div>
            ) : null}
            {aiDebug?.llm_raw ? (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Resposta bruta do LLM
                </p>
                <pre className="max-h-52 overflow-y-auto whitespace-pre-wrap rounded-xl bg-muted/60 p-3 font-mono text-[11px] leading-relaxed">
                  {aiDebug.llm_raw}
                </pre>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => setDebugOpen(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {photoOpen && cover ? (
        <div className="fixed inset-0 z-[110] flex flex-col bg-black/90">
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <p className="text-sm font-semibold">
              Foto · {pieceIndex}/{seriesTotal}
            </p>
            <button
              type="button"
              className="rounded-full p-2 hover:bg-white/10"
              onClick={() => setPhotoOpen(false)}
              aria-label="Fechar"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cover}
              alt=""
              className="max-h-full max-w-full rounded-2xl object-contain"
            />
          </div>
        </div>
      ) : null}

    </div>
  );
}
