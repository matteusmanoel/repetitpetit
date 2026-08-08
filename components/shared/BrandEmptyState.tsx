import type { ReactNode } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

const LOGO_HEADER = "/brand/repeti-petit-logo-header.svg";
const LOGO_MARK = "/brand/file.svg";

type BrandLogoProps = {
  /** header wordmark vs square mark (empty states / favicon sibling) */
  variant?: "header" | "mark";
  className?: string;
  priority?: boolean;
  alt?: string;
};

/**
 * Canonical Repeti brand image — header wordmark or square mark.
 */
export function BrandLogo({
  variant = "header",
  className,
  priority = false,
  alt = "Repeti Petit",
}: BrandLogoProps) {
  const src = variant === "mark" ? LOGO_MARK : LOGO_HEADER;
  return (
    <Image
      src={src}
      alt={alt}
      width={variant === "mark" ? 256 : 437}
      height={variant === "mark" ? 256 : 413}
      priority={priority}
      unoptimized
      className={cn(
        "w-auto object-contain",
        variant === "mark" ? "h-16" : "h-10 md:h-12",
        className,
      )}
    />
  );
}

type BrandEmptyStateProps = {
  title: string;
  description: string;
  className?: string;
  action?: ReactNode;
};

/**
 * System empty state: logo mark + title + guidance subtitle.
 */
export function BrandEmptyState({
  title,
  description,
  className,
  action,
}: BrandEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-14 text-center",
        className,
      )}
    >
      <BrandLogo variant="mark" className="h-20 opacity-90" />
      <div className="max-w-sm space-y-1.5">
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
