"use client";

import type { ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { digitsOnlyCpf, formatCpfBr } from "@/lib/br-masks";

type CpfInputProps = Omit<
  ComponentProps<typeof Input>,
  "type" | "inputMode" | "value" | "onChange"
> & {
  /** Valor controlado — dígitos ou mascarado. */
  value: string;
  /** Sempre recebe só dígitos (0–11). */
  onValueChange: (digits: string) => void;
};

/**
 * Input de CPF com máscara progressiva `000.000.000-00`.
 */
export function CpfInput({ value, onValueChange, ...props }: CpfInputProps) {
  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      autoComplete={props.autoComplete ?? "off"}
      value={formatCpfBr(value)}
      onChange={(event) => {
        onValueChange(digitsOnlyCpf(event.target.value));
      }}
    />
  );
}
