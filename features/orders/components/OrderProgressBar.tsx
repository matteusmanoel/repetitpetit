import { Check } from "lucide-react";

import {
  getProgressStepIndex,
  getProgressSteps,
  isTerminalFailureStatus,
} from "@/features/orders/status";
import type { FulfillmentType, OrderStatus } from "@/features/orders/types";
import { cn } from "@/lib/utils";

type OrderProgressBarProps = {
  status: OrderStatus;
  fulfillmentType: FulfillmentType;
};

/**
 * Barra de progresso do pedido público.
 * ADAPT do Flor: inclui passos confirmed + shipped/ready_for_pickup/na_sacolinha.
 */
export function OrderProgressBar({
  status,
  fulfillmentType,
}: OrderProgressBarProps) {
  if (isTerminalFailureStatus(status)) {
    return null;
  }

  const steps = getProgressSteps(fulfillmentType);
  const currentIndex = getProgressStepIndex(status);
  const isFullyComplete = status === "completed";

  return (
    <nav aria-label="Progresso do pedido" className="w-full">
      <ol className="flex w-full items-start justify-between gap-0.5">
        {steps.map((step, index) => {
          const isDone = isFullyComplete || index < currentIndex;
          const isCurrent = !isFullyComplete && index === currentIndex;

          return (
            <li
              key={step.id}
              className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
            >
              <div className="flex w-full items-center">
                <div
                  className={cn(
                    "h-0.5 flex-1",
                    index === 0
                      ? "bg-transparent"
                      : isDone || isCurrent
                        ? "bg-primary"
                        : "bg-border",
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                    isDone &&
                      "bg-primary text-primary-foreground",
                    isCurrent &&
                      "bg-primary text-primary-foreground ring-4 ring-primary/20",
                    !isDone &&
                      !isCurrent &&
                      "border-2 border-border bg-background text-muted-foreground",
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isDone ? (
                    <Check className="size-3.5" aria-hidden />
                  ) : (
                    index + 1
                  )}
                </span>
                <div
                  className={cn(
                    "h-0.5 flex-1",
                    index === steps.length - 1
                      ? "bg-transparent"
                      : isDone
                        ? "bg-primary"
                        : "bg-border",
                  )}
                  aria-hidden
                />
              </div>
              <span
                className={cn(
                  "max-w-full truncate px-0.5 text-center text-[11px] leading-tight sm:text-xs",
                  isDone || isCurrent
                    ? "font-medium text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
