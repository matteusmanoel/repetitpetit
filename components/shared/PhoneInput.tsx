"use client";

import type { ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { formatPhoneBr, digitsOnlyPhone } from "@/lib/phone";

type PhoneInputProps = Omit<
  ComponentProps<typeof Input>,
  "type" | "inputMode" | "value" | "onChange"
> & {
  /** Valor controlado — pode ser dígitos ou já mascarado. */
  value: string;
  /** Sempre recebe só dígitos (0–11) para o form/store. */
  onValueChange: (digits: string) => void;
};

/**
 * Input de telefone BR com máscara progressiva.
 * O estado do pai guarda dígitos; a UI mostra `(45) 99999-9999`.
 */
export function PhoneInput({
  value,
  onValueChange,
  ...props
}: PhoneInputProps) {
  return (
    <Input
      {...props}
      type="tel"
      inputMode="tel"
      autoComplete={props.autoComplete ?? "tel"}
      value={formatPhoneBr(value)}
      onChange={(event) => {
        onValueChange(digitsOnlyPhone(event.target.value).slice(0, 11));
      }}
    />
  );
}
