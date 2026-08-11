"use client";

import {
  CheckCircle2,
  Info,
  Loader2Icon,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * Toaster light-only (D17 — sem dark mode no MVP).
 * Chrome alinhado a `lib/brand-toast` / proto-toast (brand borders).
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: (
          <CheckCircle2 className="size-6 text-[var(--brand-green)]" />
        ),
        info: <Info className="size-6 text-[var(--brand-blue)]" />,
        warning: <TriangleAlert className="size-6 text-amber-600" />,
        error: <XCircle className="size-6 text-[var(--brand-pink)]" />,
        loading: <Loader2Icon className="size-5 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast !rounded-2xl !border !bg-white !font-sans !text-base !text-foreground !shadow-lg !px-4 !py-4 min-h-14",
          description: "!text-muted-foreground !font-sans !text-sm",
          success: "!border-[var(--brand-green)]/35",
          error: "!border-[var(--brand-pink)]/40",
          info: "!border-black/10",
          warning: "!border-amber-200 !bg-amber-50",
          actionButton:
            "!rounded-xl !bg-[var(--brand-green)] !text-white !font-medium",
          cancelButton: "!rounded-xl !bg-muted !text-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
