"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type CheckoutSectionProps = {
  step: number;
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

/**
 * Seção colapsável no mobile; sempre aberta a partir de `md`.
 */
export function CheckoutSection({
  step,
  title,
  summary,
  defaultOpen = true,
  children,
}: CheckoutSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => {
      setIsDesktop(mq.matches);
      if (mq.matches) setOpen(true);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <Collapsible
      open={isDesktop ? true : open}
      onOpenChange={(next) => {
        if (!isDesktop) setOpen(next);
      }}
      className="rounded-2xl border border-border bg-background"
    >
      <CollapsibleTrigger
        className={cn(
          "flex w-full min-h-11 items-center gap-3 px-4 py-3 text-left",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isDesktop && "cursor-default",
        )}
        disabled={isDesktop}
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {step}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-heading text-base font-bold text-foreground">
            {title}
          </span>
          {summary && !open && !isDesktop ? (
            <span className="truncate text-sm text-muted-foreground">
              {summary}
            </span>
          ) : null}
        </span>
        {!isDesktop ? (
          <ChevronDown
            className={cn(
              "size-5 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
            aria-hidden
          />
        ) : null}
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-border px-4 py-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
