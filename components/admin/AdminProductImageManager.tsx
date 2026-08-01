"use client";

import { GripVertical, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { ProductImageInput } from "@/features/admin/product-schemas";
import { cn } from "@/lib/utils";

type Props = {
  images: ProductImageInput[];
  onChange: (images: ProductImageInput[]) => void;
  disabled?: boolean;
};

/**
 * Upload múltiplo via `POST /api/upload` (bucket productImages) + reordenação
 * local. A lista final é persistida em `product_images.sort_order` pela action.
 */
export function AdminProductImageManager({ images, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
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
      if (inputRef.current) inputRef.current.value = "";
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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">Fotos da peça</p>
          <p className="text-xs text-muted-foreground">
            A primeira foto vira a capa. Arraste para reordenar.
          </p>
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            className="sr-only"
            disabled={disabled || uploading}
            onChange={(event) => void handleFiles(event.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
          >
            <Upload data-icon="inline-start" />
            {uploading ? "Enviando..." : "Adicionar fotos"}
          </Button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {images.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
          Nenhuma foto ainda. Adicione pelo menos uma para a capa.
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
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
                "group relative overflow-hidden rounded-xl border border-border bg-card",
                dragIndex === index && "opacity-60",
              )}
            >
              <div className="relative aspect-[3/4] w-full bg-muted">
                <Image
                  src={image.image_url}
                  alt={image.alt_text ?? `Foto ${index + 1}`}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="160px"
                />
              </div>
              <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <GripVertical className="size-3.5" />
                  {index === 0 ? "Capa" : `#${index + 1}`}
                </span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeImage(index)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Remover foto ${index + 1}`}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
