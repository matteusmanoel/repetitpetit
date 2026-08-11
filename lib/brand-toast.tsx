"use client";

/**
 * Branded toasts — Repeti tokens (promovido de
 * `app/prototype/admin-ops-ux/proto-toast.tsx`).
 */

import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { toast as sonner } from "sonner";

const base =
  "!rounded-2xl !border !font-sans !text-base !shadow-lg !px-4 !py-4 min-h-14";

export const brandToast = {
  success(title: string, description?: string) {
    return sonner.success(title, {
      description,
      icon: <CheckCircle2 className="size-6 text-[var(--brand-green)]" />,
      className: `${base} !bg-white !border-[var(--brand-green)]/35 !text-foreground`,
      descriptionClassName: "!text-muted-foreground !font-sans !text-sm",
    });
  },
  error(title: string, description?: string) {
    return sonner.error(title, {
      description,
      icon: <XCircle className="size-6 text-[var(--brand-pink)]" />,
      className: `${base} !bg-white !border-[var(--brand-pink)]/40 !text-foreground`,
      descriptionClassName: "!text-muted-foreground !font-sans !text-sm",
    });
  },
  message(title: string, description?: string) {
    return sonner.message(title, {
      description,
      icon: <Info className="size-6 text-[var(--brand-blue)]" />,
      className: `${base} !bg-white !border-black/10 !text-foreground`,
      descriptionClassName: "!text-muted-foreground !font-sans !text-sm",
    });
  },
  warning(title: string, description?: string) {
    return sonner.warning(title, {
      description,
      icon: <AlertTriangle className="size-6 text-amber-600" />,
      className: `${base} !bg-amber-50 !border-amber-200 !text-foreground`,
      descriptionClassName: "!text-amber-900/70 !font-sans !text-sm",
    });
  },
};
