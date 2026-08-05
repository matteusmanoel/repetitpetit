"use client";

import type { ReactNode } from "react";

import { PhoneInput } from "@/components/shared/PhoneInput";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ContactValues = {
  fullName: string;
  phone: string;
  email: string;
};

export type ContactErrors = Partial<Record<keyof ContactValues, string>>;

type CheckoutContactSectionProps = {
  values: ContactValues;
  errors: ContactErrors;
  onChange: <K extends keyof ContactValues>(
    key: K,
    value: ContactValues[K],
  ) => void;
};

export function CheckoutContactSection({
  values,
  errors,
  onChange,
}: CheckoutContactSectionProps) {
  return (
    <div className="flex flex-col gap-3">
      <Field label="Nome completo" htmlFor="fullName" error={errors.fullName}>
        <Input
          id="fullName"
          name="fullName"
          autoComplete="name"
          value={values.fullName}
          onChange={(event) => onChange("fullName", event.target.value)}
          placeholder="Seu nome completo"
          className="h-11"
          aria-invalid={Boolean(errors.fullName)}
        />
      </Field>

      <Field
        label="Telefone / WhatsApp"
        htmlFor="phone"
        error={errors.phone}
      >
        <PhoneInput
          id="phone"
          name="phone"
          value={values.phone}
          onValueChange={(digits) => onChange("phone", digits)}
          placeholder="(45) 99999-9999"
          className="h-11"
          aria-invalid={Boolean(errors.phone)}
        />
      </Field>

      <Field label="E-mail" htmlFor="email" error={errors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={values.email}
          onChange={(event) => onChange("email", event.target.value)}
          placeholder="seuemail@exemplo.com"
          className="h-11"
          aria-invalid={Boolean(errors.email)}
        />
      </Field>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
