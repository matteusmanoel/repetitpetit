"use client";

import Image from "next/image";
import Link from "next/link";
import { Trash2, Upload } from "lucide-react";
import { useId, useRef, useState, useTransition } from "react";

import { AdminLabelPrintQueue } from "@/components/admin/AdminLabelPrintQueue";
import { Button } from "@/components/ui/button";
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
  confirmIntakeBatchAction,
  generateIntakePreviewAction,
} from "@/features/admin/ai-intake/actions";
import type {
  IntakeDraftItem,
} from "@/features/admin/ai-intake/schemas";
import {
  PRODUCT_CONDITION_LABELS,
  PRODUCT_CONDITIONS,
  PRODUCT_GENDER_LABELS,
  PRODUCT_GENDERS,
  SIZE_GROUP_LABELS,
  SIZE_GROUPS,
  slugifyProductName,
} from "@/features/admin/product-constants";
import type { CategoryOption } from "@/features/admin/product-types";
import type { Database } from "@/lib/supabase/types";

type Job = Database["public"]["Tables"]["label_print_jobs"]["Row"];

type SessionItem = {
  client_id: string;
  images: Array<{ image_url: string; alt_text?: string | null }>;
  audio_note: string;
  audio_file_name: string | null;
};

type Props = {
  categories: CategoryOption[];
  aiConfigured: boolean;
};

function newClientId(): string {
  return crypto.randomUUID();
}

export function AdminAiIntakeClient({ categories, aiConfigured }: Props) {
  const [sessionItems, setSessionItems] = useState<SessionItem[]>([
    {
      client_id: newClientId(),
      images: [],
      audio_note: "",
      audio_file_name: null,
    },
  ]);
  const [drafts, setDrafts] = useState<IntakeDraftItem[] | null>(null);
  const [previewMode, setPreviewMode] = useState<"ai" | "manual" | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [createdSummary, setCreatedSummary] = useState<
    Array<{ staffCode: string; productId: string }>
  >([]);
  const [pending, startTransition] = useTransition();
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  async function uploadPhotos(clientId: string, files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadingId(clientId);
    setError(null);
    try {
      const urls: Array<{ image_url: string; alt_text: null }> = [];
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.set("file", file);
        body.set("bucket", "productImages");
        body.set("pathPrefix", "ai-intake");
        const response = await fetch("/api/upload", {
          method: "POST",
          body,
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(payload?.error ?? "Falha ao enviar foto.");
        }
        const payload = (await response.json()) as { url: string };
        urls.push({ image_url: payload.url, alt_text: null });
      }
      setSessionItems((prev) =>
        prev.map((item) =>
          item.client_id === clientId
            ? { ...item, images: [...item.images, ...urls] }
            : item,
        ),
      );
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Falha ao enviar fotos.",
      );
    } finally {
      setUploadingId(null);
    }
  }

  function updateDraft(clientId: string, patch: Partial<IntakeDraftItem>) {
    setDrafts((prev) =>
      prev
        ? prev.map((d) => (d.client_id === clientId ? { ...d, ...patch } : d))
        : prev,
    );
  }

  function handleGeneratePreview() {
    setError(null);
    setWarning(null);
    const payload = {
      items: sessionItems
        .filter((item) => item.images.length > 0)
        .map((item) => ({
          client_id: item.client_id,
          images: item.images,
          audio_note: item.audio_note.trim() || null,
        })),
    };

    if (payload.items.length === 0) {
      setError("Adicione fotos em pelo menos uma peça.");
      return;
    }

    startTransition(async () => {
      const result = await generateIntakePreviewAction(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDrafts(result.drafts);
      setPreviewMode(result.mode);
      setWarning(result.warning ?? null);
      setBatchId(null);
      setJobs([]);
      setCreatedSummary([]);
    });
  }

  function handleConfirm() {
    if (!drafts) return;
    setError(null);

    const prepared = drafts.map((draft) => ({
      ...draft,
      name: draft.name.trim(),
      slug: draft.slug.trim() || slugifyProductName(draft.name),
      price:
        typeof draft.price === "string"
          ? Number(draft.price.replace(",", "."))
          : draft.price,
      compare_at_price:
        draft.compare_at_price === "" || draft.compare_at_price == null
          ? null
          : typeof draft.compare_at_price === "string"
            ? Number(draft.compare_at_price.replace(",", "."))
            : draft.compare_at_price,
      tags: draft.tags ?? [],
      images: draft.images,
    }));

    startTransition(async () => {
      const result = await confirmIntakeBatchAction({ items: prepared });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBatchId(result.batchId);
      setJobs(result.jobs);
      setCreatedSummary(
        result.created.map((c) => ({
          staffCode: c.staffCode,
          productId: c.productId,
        })),
      );
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <p className="text-sm text-muted-foreground">
          {aiConfigured
            ? "IA configurada: fotos + notas geram um preview editável."
            : "IA sem chave — o preview fica editável em branco para preenchimento manual. Cadastro e fila de impressão funcionam igual."}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Importação XLSX continua em{" "}
          <Link
            href="/admin/produtos/importar"
            className="underline underline-offset-2"
          >
            /admin/produtos/importar
          </Link>
          .
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {warning ? (
        <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground" role="status">
          {warning}
        </p>
      ) : null}

      {!batchId ? (
        <>
          <section className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-heading text-base font-extrabold">
                Peças da sessão
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setSessionItems((prev) => [
                    ...prev,
                    {
                      client_id: newClientId(),
                      images: [],
                      audio_note: "",
                      audio_file_name: null,
                    },
                  ])
                }
              >
                Adicionar peça
              </Button>
            </div>

            {sessionItems.map((item, index) => (
              <SessionItemCard
                key={item.client_id}
                index={index}
                item={item}
                uploading={uploadingId === item.client_id}
                canRemove={sessionItems.length > 1}
                onRemove={() =>
                  setSessionItems((prev) =>
                    prev.filter((row) => row.client_id !== item.client_id),
                  )
                }
                onPhotos={(files) => void uploadPhotos(item.client_id, files)}
                onRemoveImage={(imageIndex) =>
                  setSessionItems((prev) =>
                    prev.map((row) =>
                      row.client_id === item.client_id
                        ? {
                            ...row,
                            images: row.images.filter((_, i) => i !== imageIndex),
                          }
                        : row,
                    ),
                  )
                }
                onAudioNote={(value) =>
                  setSessionItems((prev) =>
                    prev.map((row) =>
                      row.client_id === item.client_id
                        ? { ...row, audio_note: value }
                        : row,
                    ),
                  )
                }
                onAudioFile={(file) => {
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const text =
                      typeof reader.result === "string"
                        ? `[áudio: ${file.name}]`
                        : "";
                    setSessionItems((prev) =>
                      prev.map((row) =>
                        row.client_id === item.client_id
                          ? {
                              ...row,
                              audio_file_name: file.name,
                              audio_note: row.audio_note
                                ? `${row.audio_note}\n${text}`
                                : text,
                            }
                          : row,
                      ),
                    );
                  };
                  reader.readAsDataURL(file);
                }}
              />
            ))}

            <Button
              type="button"
              onClick={handleGeneratePreview}
              disabled={pending || uploadingId !== null}
            >
              {pending ? "Gerando…" : "Gerar preview"}
            </Button>
          </section>

          {drafts ? (
            <section className="flex flex-col gap-4">
              <div>
                <h2 className="font-heading text-base font-extrabold">
                  Preview editável
                </h2>
                <p className="text-sm text-muted-foreground">
                  Modo: {previewMode === "ai" ? "IA" : "manual"}. Confira e
                  ajuste antes de cadastrar.
                </p>
              </div>

              {drafts.map((draft, index) => (
                <PreviewCard
                  key={draft.client_id}
                  index={index}
                  draft={draft}
                  categories={categories}
                  onChange={(patch) => updateDraft(draft.client_id, patch)}
                />
              ))}

              <Button
                type="button"
                onClick={handleConfirm}
                disabled={pending}
              >
                {pending
                  ? "Cadastrando…"
                  : "Confirmar e enfileirar etiquetas"}
              </Button>
            </section>
          ) : null}
        </>
      ) : (
        <section className="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-heading text-base font-extrabold">
              Peças cadastradas
            </h2>
            <ul className="mt-2 flex flex-col gap-1 text-sm">
              {createdSummary.map((row) => (
                <li key={row.productId}>
                  <Link
                    href={`/admin/produtos/${row.productId}`}
                    className="font-mono underline-offset-2 hover:underline"
                  >
                    {row.staffCode}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <AdminLabelPrintQueue batchId={batchId} initialJobs={jobs} />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setBatchId(null);
              setJobs([]);
              setDrafts(null);
              setCreatedSummary([]);
              setSessionItems([
                {
                  client_id: newClientId(),
                  images: [],
                  audio_note: "",
                  audio_file_name: null,
                },
              ]);
            }}
          >
            Nova sessão de intake
          </Button>
        </section>
      )}
    </div>
  );
}

function SessionItemCard({
  index,
  item,
  uploading,
  canRemove,
  onRemove,
  onPhotos,
  onRemoveImage,
  onAudioNote,
  onAudioFile,
}: {
  index: number;
  item: SessionItem;
  uploading: boolean;
  canRemove: boolean;
  onRemove: () => void;
  onPhotos: (files: FileList | null) => void;
  onRemoveImage: (index: number) => void;
  onAudioNote: (value: string) => void;
  onAudioFile: (file: File | null) => void;
}) {
  const photoInputId = useId();
  const audioInputId = useId();
  const photoRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Peça {index + 1}</h3>
        {canRemove ? (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
            Remover
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {item.images.map((image, imageIndex) => (
          <div
            key={`${image.image_url}-${imageIndex}`}
            className="relative size-16 overflow-hidden rounded-md bg-muted"
          >
            <Image
              src={image.image_url}
              alt=""
              fill
              unoptimized
              className="object-cover"
              sizes="64px"
            />
            <button
              type="button"
              className="absolute right-0.5 top-0.5 rounded bg-background/90 p-0.5"
              onClick={() => onRemoveImage(imageIndex)}
              aria-label="Remover foto"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          ref={photoRef}
          id={photoInputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          className="sr-only"
          disabled={uploading}
          onChange={(event) => {
            onPhotos(event.target.files);
            event.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => photoRef.current?.click()}
        >
          <Upload className="mr-1.5 size-3.5" />
          {uploading ? "Enviando…" : "Fotos"}
        </Button>

        <input
          ref={audioRef}
          id={audioInputId}
          type="file"
          accept="audio/*,.m4a,.mp3,.webm,.wav"
          className="sr-only"
          onChange={(event) => {
            onAudioFile(event.target.files?.[0] ?? null);
            event.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => audioRef.current?.click()}
        >
          Áudio (opcional)
        </Button>
        {item.audio_file_name ? (
          <span className="text-xs text-muted-foreground">
            {item.audio_file_name}
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`note-${item.client_id}`}>
          Nota / transcrição (opcional)
        </Label>
        <Textarea
          id={`note-${item.client_id}`}
          value={item.audio_note}
          onChange={(event) => onAudioNote(event.target.value)}
          rows={2}
          placeholder="Ex.: casaco azul GAP, tamanho 2 anos, seminovo…"
        />
      </div>
    </div>
  );
}

function PreviewCard({
  index,
  draft,
  categories,
  onChange,
}: {
  index: number;
  draft: IntakeDraftItem;
  categories: CategoryOption[];
  onChange: (patch: Partial<IntakeDraftItem>) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold">Preview {index + 1}</h3>

      {draft.images[0] ? (
        <div className="relative h-32 w-full overflow-hidden rounded-md bg-muted sm:h-40">
          <Image
            src={draft.images[0].image_url}
            alt=""
            fill
            unoptimized
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 480px"
          />
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label>Nome</Label>
          <Input
            value={draft.name}
            onChange={(event) => {
              const name = event.target.value;
              onChange({
                name,
                slug: slugifyProductName(name),
              });
            }}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Preço (R$)</Label>
          <Input
            inputMode="decimal"
            value={draft.price ?? ""}
            onChange={(event) => onChange({ price: event.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Marca</Label>
          <Input
            value={draft.brand ?? ""}
            onChange={(event) =>
              onChange({ brand: event.target.value || null })
            }
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Tamanho</Label>
          <Input
            value={draft.size_label}
            onChange={(event) => onChange({ size_label: event.target.value })}
            placeholder="2 anos"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Grupo</Label>
          <Select
            value={draft.size_group}
            onValueChange={(value) =>
              onChange({
                size_group: value as IntakeDraftItem["size_group"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SIZE_GROUPS.map((group) => (
                <SelectItem key={group} value={group}>
                  {SIZE_GROUP_LABELS[group]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Gênero</Label>
          <Select
            value={draft.gender}
            onValueChange={(value) =>
              onChange({ gender: value as IntakeDraftItem["gender"] })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRODUCT_GENDERS.map((gender) => (
                <SelectItem key={gender} value={gender}>
                  {PRODUCT_GENDER_LABELS[gender]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Condição</Label>
          <Select
            value={draft.condition}
            onValueChange={(value) =>
              onChange({
                condition: value as IntakeDraftItem["condition"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRODUCT_CONDITIONS.map((condition) => (
                <SelectItem key={condition} value={condition}>
                  {PRODUCT_CONDITION_LABELS[condition]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label>Categoria</Label>
          <Select
            value={draft.category_id ?? "none"}
            onValueChange={(value) =>
              onChange({
                category_id: value === "none" ? null : value,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Opcional" />
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
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label>Descrição</Label>
          <Textarea
            value={draft.description ?? ""}
            onChange={(event) =>
              onChange({ description: event.target.value || null })
            }
            rows={3}
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label>Tags (vírgula)</Label>
          <Input
            value={(draft.tags ?? []).join(", ")}
            onChange={(event) =>
              onChange({
                tags: event.target.value
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>
      </div>
    </div>
  );
}
