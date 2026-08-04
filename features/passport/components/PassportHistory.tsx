"use client";

import { ChevronDown } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { formatPassportHistoryLine } from "@/features/passport/format-history";
import type { PassportHistoryEvent } from "@/features/passport/types";
import { cn } from "@/lib/utils";

type Props = {
  events: PassportHistoryEvent[];
};

/**
 * Collapsible status timeline for Garment Passport (SN-15).
 * Oldest → newest; empty state when no events yet.
 */
export function PassportHistory({ events }: Props) {
  return (
    <Collapsible
      defaultOpen={events.length > 0 && events.length <= 8}
      className="rounded-xl border border-border bg-card"
    >
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center justify-between gap-3 px-4 py-3 text-left",
          "text-sm font-semibold text-foreground",
          "hover:bg-muted/40 [&[data-state=open]>svg]:rotate-180",
        )}
      >
        Histórico
        <ChevronDown
          className="size-4 shrink-0 text-muted-foreground transition-transform"
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-border px-4 py-3">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum evento de status registrado ainda.
          </p>
        ) : (
          <ol className="flex flex-col gap-2.5">
            {events.map((event) => (
              <li
                key={event.id}
                className="text-sm leading-snug text-foreground"
              >
                {formatPassportHistoryLine(event)}
              </li>
            ))}
          </ol>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
