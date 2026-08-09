"use client";

import type { ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import {
  centsToDecimalString,
  formatCentsBr,
  parseCurrencyDigitsToCents,
} from "@/lib/br-masks";
import { cn } from "@/lib/utils";

type CurrencyInputProps = Omit<
  ComponentProps<typeof Input>,
  "type" | "inputMode" | "value" | "onChange" | "name"
> & {
  /** Centavos controlados (`null` = vazio). */
  cents: number | null;
  onCentsChange: (cents: number | null) => void;
  /** Nome do hidden com valor decimal (`55.00`) para FormData. */
  name?: string;
  /** Prefixo visual R$ (default true). */
  showPrefix?: boolean;
};

/**
 * Input de moeda BRL com máscara por centavos durante a digitação.
 * O pai guarda centavos; o submit usa hidden `name` em decimal.
 */
export function CurrencyInput({
  cents,
  onCentsChange,
  name,
  showPrefix = true,
  className,
  ...props
}: CurrencyInputProps) {
  const display = cents == null ? "" : formatCentsBr(cents);
  const decimal = cents == null ? "" : centsToDecimalString(cents);

  return (
    <div className="relative">
      {name ? <input type="hidden" name={name} value={decimal} /> : null}
      {showPrefix ? (
        <span
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
          aria-hidden
        >
          R$
        </span>
      ) : null}
      <Input
        {...props}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={display}
        className={cn(showPrefix && "pl-10", className)}
        onChange={(event) => {
          onCentsChange(parseCurrencyDigitsToCents(event.target.value));
        }}
      />
    </div>
  );
}
