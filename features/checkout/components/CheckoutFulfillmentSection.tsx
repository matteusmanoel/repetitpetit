"use client";

import { MapPin, Store } from "lucide-react";
import type { ReactNode } from "react";

import type { FulfillmentType } from "@/features/checkout/types";
import { formatPrice } from "@/features/catalog/format-price";
import { cn } from "@/lib/utils";

type CheckoutFulfillmentSectionProps = {
  value: FulfillmentType | "";
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  pickupAddress: string | null;
  deliveryAmount: number | null;
  deliveryDescription: string | null;
  error?: string;
  onChange: (value: FulfillmentType) => void;
};

export function CheckoutFulfillmentSection({
  value,
  pickupEnabled,
  deliveryEnabled,
  pickupAddress,
  deliveryAmount,
  deliveryDescription,
  error,
  onChange,
}: CheckoutFulfillmentSectionProps) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="sr-only">Como você quer receber</legend>

      <div className="grid gap-2 sm:grid-cols-2">
        {pickupEnabled ? (
          <FulfillmentCard
            selected={value === "pickup"}
            onSelect={() => onChange("pickup")}
            icon={<Store className="size-5" aria-hidden />}
            title="Retirada"
            description={
              pickupAddress
                ? `Na loja · ${pickupAddress}`
                : "Retire na loja em Foz do Iguaçu"
            }
            priceLabel="Grátis"
          />
        ) : null}

        {deliveryEnabled ? (
          <FulfillmentCard
            selected={value === "delivery"}
            onSelect={() => onChange("delivery")}
            icon={<MapPin className="size-5" aria-hidden />}
            title="Entrega"
            description={
              deliveryDescription ?? "Entrega em Foz do Iguaçu"
            }
            priceLabel={
              deliveryAmount != null
                ? formatPrice(deliveryAmount)
                : "Consulte"
            }
          />
        ) : null}
      </div>

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
  priceLabel,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: ReactNode;
  title: string;
  description: string;
  priceLabel: string;
}) {
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer flex-col gap-2 rounded-xl border px-3 py-3 transition-colors",
        selected
          ? "border-primary bg-primary/5 text-foreground"
          : "border-border bg-background hover:bg-muted/60",
      )}
    >
      <span className="flex items-start gap-3">
        <input
          type="radio"
          name="fulfillmentType"
          checked={selected}
          onChange={onSelect}
          className="mt-1 size-4 accent-[hsl(210_77%_37%)]"
        />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center gap-2 font-medium">
            {icon}
            {title}
          </span>
          <span className="text-sm text-muted-foreground">{description}</span>
          <span className="text-sm font-medium text-primary">{priceLabel}</span>
        </span>
      </span>
    </label>
  );
}
