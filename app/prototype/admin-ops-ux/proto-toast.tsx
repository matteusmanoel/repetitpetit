"use client";

/**
 * PROTOTYPE branded toasts — Repeti tokens (not default sonner chrome).
 */

import { CheckCircle2, Info, AlertTriangle, XCircle } from "lucide-react";
import { toast as sonner } from "sonner";

const base =
  "!rounded-2xl !border !font-sans !text-sm !shadow-lg !px-4 !py-3";

export const protoToast = {
  success(title: string, description?: string) {
    return sonner.success(title, {
      description,
      icon: <CheckCircle2 className="size-5 text-[var(--brand-green)]" />,
      className: `${base} !bg-white !border-[var(--brand-green)]/35 !text-foreground`,
      descriptionClassName: "!text-muted-foreground !font-sans",
    });
  },
  error(title: string, description?: string) {
    return sonner.error(title, {
      description,
      icon: <XCircle className="size-5 text-[var(--brand-pink)]" />,
      className: `${base} !bg-white !border-[var(--brand-pink)]/40 !text-foreground`,
      descriptionClassName: "!text-muted-foreground !font-sans",
    });
  },
  message(title: string, description?: string) {
    return sonner.message(title, {
      description,
      icon: <Info className="size-5 text-[var(--brand-blue)]" />,
      className: `${base} !bg-white !border-black/10 !text-foreground`,
      descriptionClassName: "!text-muted-foreground !font-sans",
    });
  },
  warning(title: string, description?: string) {
    return sonner.warning(title, {
      description,
      icon: <AlertTriangle className="size-5 text-amber-600" />,
      className: `${base} !bg-amber-50 !border-amber-200 !text-foreground`,
      descriptionClassName: "!text-amber-900/70 !font-sans",
    });
  },
};
