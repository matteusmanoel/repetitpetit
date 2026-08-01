import Image from "next/image";

import { cn } from "@/lib/utils";

type MediaThumbProps = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  priority?: boolean;
};

/**
 * Thumb de mídia com aspect 3/4 (fotos verticais de celular do acervo).
 * Sem `src`, mostra placeholder neutro.
 */
export function MediaThumb({
  src,
  alt,
  className,
  priority = false,
}: MediaThumbProps) {
  return (
    <div
      className={cn(
        "relative aspect-3/4 w-full overflow-hidden bg-muted",
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover"
          priority={priority}
        />
      ) : (
        <div
          aria-hidden
          className="flex size-full items-center justify-center text-sm text-muted-foreground"
        >
          Sem foto
        </div>
      )}
    </div>
  );
}
