"use client";

import { MapPin, ShoppingBag } from "lucide-react";
import type { ReactNode } from "react";

import type { FulfillmentType } from "@/features/checkout/types";
import { cn } from "@/lib/utils";

type CheckoutFulfillmentSectionProps = {
  value: FulfillmentType | "";
  /** Entrega imediata com knobs + CEP loja (D104 / #127). */
  deliveryAvailable?: boolean;
  pickupAddress: string | null;
  error?: string;
  onChange: (value: FulfillmentType) => void;
};

/**
 * Escolha binária D102: Sacolinha pré-selecionada; entrega imediata opcional.
 */
export function CheckoutFulfillmentSection({
  value,
  deliveryAvailable = false,
  pickupAddress,
  error,
  onChange,
}: CheckoutFulfillmentSectionProps) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="sr-only">Como você quer receber</legend>

      <div className="grid gap-2 sm:grid-cols-2">
        <FulfillmentCard
          selected={value === "pickup"}
          onSelect={() => onChange("pickup")}
          icon={<ShoppingBag className="size-5" aria-hidden />}
          title="Sacolinha"
          description="Guarde na Sacolinha — retire quando quiser"
          detail={
            pickupAddress
              ? `Retire na loja · ${pickupAddress}`
              : "Retire na loja em Foz do Iguaçu"
          }
          priceLabel="Grátis"
        />

        <FulfillmentCard
          selected={value === "delivery"}
          onSelect={() => onChange("delivery")}
          disabled={!deliveryAvailable}
          icon={<MapPin className="size-5" aria-hidden />}
          title="Entrega imediata"
          description={
            deliveryAvailable
              ? "Receba em casa — calcule o frete pelo CEP"
              : "Entrega indisponível no momento"
          }
          detail="Foz do Iguaçu e região"
          priceLabel={deliveryAvailable ? "Calcular frete" : "Indisponível"}
        />
      </div>

      {value === "delivery" && !deliveryAvailable ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          A entrega imediata não está configurada. Escolha{" "}
          <span className="font-medium text-foreground">Sacolinha</span> para
          concluir o pagamento agora — sem endereço.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

function FulfillmentCard({
  selected,
  onSelect,
  icon,
  title,
  description,
  detail,
  priceLabel,
  disabled = false,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: ReactNode;
  title: string;
  description: string;
  detail: string;
  priceLabel: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex min-h-11 flex-col gap-2 rounded-xl border px-3 py-3 transition-colors",
        disabled
          ? "cursor-not-allowed border-border/60 bg-muted/30 text-muted-foreground opacity-70"
          : selected
            ? "cursor-pointer border-primary bg-primary/5 text-foreground"
            : "cursor-pointer border-border bg-background hover:bg-muted/60",
      )}
    >
      <span className="flex items-start gap-3">
        <input
          type="radio"
          name="fulfillmentType"
          checked={selected}
          disabled={disabled}
          onChange={onSelect}
          className="mt-1 size-4 accent-[hsl(210_77%_37%)]"
        />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center gap-2 font-medium">
            {icon}
            {title}
          </span>
          <span className="text-sm text-muted-foreground">{description}</span>
          <span className="text-xs text-muted-foreground">{detail}</span>
          <span
            className={cn(
              "text-sm font-medium",
              disabled ? "text-muted-foreground" : "text-primary",
            )}
          >
            {priceLabel}
          </span>
        </span>
      </span>
    </label>
  );
}
