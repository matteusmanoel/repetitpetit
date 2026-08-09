"use client";

import { Camera, GripVertical, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { ProductImageInput } from "@/features/admin/product-schemas";
import { cn } from "@/lib/utils";

type Props = {
  images: ProductImageInput[];
  onChange: (images: ProductImageInput[]) => void;
  disabled?: boolean;
  /** Capa menor — útil em modal com grid lado a lado. */
  compact?: boolean;
};

/**
 * Upload múltiplo via `POST /api/upload` (bucket productImages) + reordenação
 * local. Câmera no mobile via `capture="environment"`.
 */
export function AdminProductImageManager({
  images,
  onChange,
  disabled,
  compact = false,
}: Props) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    setUploading(true);
    setError(null);

    const next = [...images];

    try {
      for (const file of Array.from(fileList)) {
        const body = new FormData();
        body.set("file", file);
        body.set("bucket", "productImages");

        const response = await fetch("/api/upload", {
          method: "POST",
          body,
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(payload?.error ?? "Falha ao enviar imagem.");
        }

        const payload = (await response.json()) as { url: string };
        next.push({ image_url: payload.url, alt_text: null });
      }

      onChange(next);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Falha ao enviar imagem.",
      );
    } finally {
      setUploading(false);
      if (galleryRef.current) galleryRef.current.value = "";
      if (cameraRef.current) cameraRef.current.value = "";
    }
  }

  function moveImage(from: number, to: number) {
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  function removeImage(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  const cover = images[0] ?? null;

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={galleryRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        multiple
        className="sr-only"
        disabled={disabled || uploading}
        onChange={(event) => void handleFiles(event.target.files)}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        disabled={disabled || uploading}
        onChange={(event) => void handleFiles(event.target.files)}
      />

      <div className="relative overflow-hidden rounded-2xl border border-border bg-muted">
        <div
          className={cn(
            "relative aspect-3/4 w-full",
            compact ? "max-h-56 sm:max-h-64" : "max-h-72 sm:max-h-80",
          )}
        >
          {cover ? (
            <Image
              src={cover.image_url}
              alt={cover.alt_text ?? "Capa da peça"}
              fill
              unoptimized
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 420px"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-sm text-muted-foreground">
              <Camera className="size-8 opacity-60" />
              <p>Nenhuma foto ainda</p>
              <p className="text-xs">A primeira vira a capa no catálogo</p>
            </div>
          )}
          {cover ? (
            <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Capa
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          className={cn("gap-2", compact ? "h-10" : "h-11")}
          disabled={disabled || uploading}
          onClick={() => cameraRef.current?.click()}
        >
          <Camera className="size-4" />
          {uploading ? "Enviando…" : "Câmera"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className={cn("gap-2", compact ? "h-10" : "h-11")}
          disabled={disabled || uploading}
          onClick={() => galleryRef.current?.click()}
        >
          <Upload className="size-4" />
          {uploading ? "Enviando…" : "Galeria"}
        </Button>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {images.length > 0 ? (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <li
              key={`${image.image_url}-${index}`}
              draggable={!disabled}
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (dragIndex === null || dragIndex === index) return;
                moveImage(dragIndex, index);
                setDragIndex(null);
              }}
              onDragEnd={() => setDragIndex(null)}
              className={cn(
    "group relative w-24 shrink-0 overflow-hidden rounded-xl border border-border bg-card",
                dragIndex === index && "opacity-60",
                index === 0 && "ring-2 ring-[var(--brand-green)]",
              )}
            >
              <div className="relative aspect-3/4 w-full bg-muted">
                <Image
                  src={image.image_url}
                  alt={image.alt_text ?? `Foto ${index + 1}`}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="64px"
                />
              </div>
              <div className="flex items-center justify-between gap-0.5 px-1 py-0.5">
                <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <GripVertical className="size-3" />
                  {index === 0 ? "Capa" : index + 1}
                </span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeImage(index)}
                  className="rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Remover foto ${index + 1}`}
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {images.length > 1 ? (
        <p className="text-[11px] text-muted-foreground">
          Arraste as miniaturas para reordenar. A primeira é a capa.
        </p>
      ) : null}
    </div>
  );
}
