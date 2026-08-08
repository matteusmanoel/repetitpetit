import type { SVGProps } from "react";

import { cn } from "@/lib/utils";

type InstagramIconProps = SVGProps<SVGSVGElement> & {
  /** Lucide-compatible size (maps to width/height). */
  size?: number | string;
  strokeWidth?: number | string;
};

/**
 * Instagram glyph in Lucide stroke style — brand icons were removed from
 * lucide-react v1, but SQ-3 still wants an Instagram mark (not Heart).
 */
export function InstagramIcon({
  className,
  size = 24,
  strokeWidth = 2,
  ...props
}: InstagramIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn("shrink-0", className)}
      {...props}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}
