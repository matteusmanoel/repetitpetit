"use client";

import { Loader2 } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/features/catalog/format-price";
import type { ShippingRuleOption } from "@/features/checkout/types";
import { fetchAddressByCep } from "@/lib/viacep";

export type AddressValues = {
  recipientName: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  postalCode: string;
  reference: string;
};

export type AddressErrors = Partial<Record<keyof AddressValues, string>>;

type CheckoutAddressSectionProps = {
  values: AddressValues;
  errors: AddressErrors;
  deliveryRule: ShippingRuleOption | null;
  onChange: <K extends keyof AddressValues>(
    key: K,
    value: AddressValues[K],
  ) => void;
  onAutofill: (partial: Partial<AddressValues>) => void;
};

export function CheckoutAddressSection({
  values,
  errors,
  deliveryRule,
  onChange,
  onAutofill,
}: CheckoutAddressSectionProps) {
  const [cepLoading, setCepLoading] = useState(false);
  const [cepMessage, setCepMessage] = useState<string | null>(null);

  async function handleCepLookup() {
    setCepMessage(null);
    setCepLoading(true);
    const result = await fetchAddressByCep(values.postalCode);
    setCepLoading(false);

    if (!result.ok) {
      const messages = {
        invalid_cep: "Informe um CEP válido com 8 dígitos.",
        not_found: "CEP não encontrado.",
        network: "Não foi possível consultar o CEP. Tente de novo.",
      } as const;
      setCepMessage(messages[result.reason]);
      return;
    }

    onAutofill({
      postalCode: result.address.postalCode,
      street: result.address.street,
      complement: result.address.complement,
      neighborhood: result.address.neighborhood,
      city: result.address.city,
      state: result.address.state,
    });
    setCepMessage("Endereço preenchido pelo CEP.");
  }

  return (
    <div className="flex flex-col gap-3">
      {deliveryRule ? (
        <p className="rounded-xl bg-muted/70 px-3 py-2 text-sm text-foreground">
          Frete:{" "}
          <span className="font-medium text-primary">
            {formatPrice(deliveryRule.amount)}
          </span>
          {deliveryRule.description
            ? ` · ${deliveryRule.description}`
            : null}
          {deliveryRule.cities.length > 0
            ? ` · ${deliveryRule.cities.join(", ")}`
            : null}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:gap-2">
        <div className="flex-1">
          <Field label="CEP" htmlFor="postalCode" error={errors.postalCode}>
            <Input
              id="postalCode"
              name="postalCode"
              inputMode="numeric"
              autoComplete="postal-code"
              value={values.postalCode}
              onChange={(event) =>
                onChange("postalCode", event.target.value.replace(/\D/g, "").slice(0, 8))
              }
              onBlur={() => {
                if (values.postalCode.replace(/\D/g, "").length === 8) {
                  void handleCepLookup();
                }
              }}
              placeholder="85851000"
              className="h-11"
              aria-invalid={Boolean(errors.postalCode)}
            />
          </Field>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-11 shrink-0"
          disabled={cepLoading || values.postalCode.replace(/\D/g, "").length !== 8}
          onClick={() => void handleCepLookup()}
        >
          {cepLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Buscando…
            </>
          ) : (
            "Buscar CEP"
          )}
        </Button>
      </div>

      {cepMessage ? (
        <p className="text-sm text-muted-foreground" role="status">
          {cepMessage}
        </p>
      ) : null}

      <Field
        label="Nome do destinatário"
        htmlFor="recipientName"
        error={errors.recipientName}
      >
        <Input
          id="recipientName"
          name="recipientName"
          autoComplete="name"
          value={values.recipientName}
          onChange={(event) => onChange("recipientName", event.target.value)}
          className="h-11"
          aria-invalid={Boolean(errors.recipientName)}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
        <Field label="Rua" htmlFor="street" error={errors.street}>
          <Input
            id="street"
            name="street"
            autoComplete="street-address"
            value={values.street}
            onChange={(event) => onChange("street", event.target.value)}
            className="h-11"
            aria-invalid={Boolean(errors.street)}
          />
        </Field>
        <Field label="Número" htmlFor="number" error={errors.number}>
          <Input
            id="number"
            name="number"
            value={values.number}
            onChange={(event) => onChange("number", event.target.value)}
            className="h-11"
            aria-invalid={Boolean(errors.number)}
          />
        </Field>
      </div>

      <Field
        label="Complemento (opcional)"
        htmlFor="complement"
        error={errors.complement}
      >
        <Input
          id="complement"
          name="complement"
          value={values.complement}
          onChange={(event) => onChange("complement", event.target.value)}
          className="h-11"
          aria-invalid={Boolean(errors.complement)}
        />
      </Field>

      <Field
        label="Bairro"
        htmlFor="neighborhood"
        error={errors.neighborhood}
      >
        <Input
          id="neighborhood"
          name="neighborhood"
          value={values.neighborhood}
          onChange={(event) => onChange("neighborhood", event.target.value)}
          className="h-11"
          aria-invalid={Boolean(errors.neighborhood)}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-[1fr_80px]">
        <Field label="Cidade" htmlFor="city" error={errors.city}>
          <Input
            id="city"
            name="city"
            autoComplete="address-level2"
            value={values.city}
            onChange={(event) => onChange("city", event.target.value)}
            className="h-11"
            aria-invalid={Boolean(errors.city)}
          />
        </Field>
        <Field label="UF" htmlFor="state" error={errors.state}>
          <Input
            id="state"
            name="state"
            autoComplete="address-level1"
            maxLength={2}
            value={values.state}
            onChange={(event) =>
              onChange("state", event.target.value.toUpperCase().slice(0, 2))
            }
            className="h-11"
            aria-invalid={Boolean(errors.state)}
          />
        </Field>
      </div>

      <Field
        label="Referência (opcional)"
        htmlFor="reference"
        error={errors.reference}
      >
        <Input
          id="reference"
          name="reference"
          value={values.reference}
          onChange={(event) => onChange("reference", event.target.value)}
          placeholder="Ponto de referência"
          className="h-11"
          aria-invalid={Boolean(errors.reference)}
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
