"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  initialDeliverySettingsActionState,
  type DeliverySettingsActionState,
} from "@/features/admin/delivery-settings/action-state";
import type { AdminDeliverySettings } from "@/features/admin/delivery-settings/queries";

type DeliverySettingsFormProps = {
  settings: AdminDeliverySettings;
  action: (
    prev: DeliverySettingsActionState,
    formData: FormData,
  ) => Promise<DeliverySettingsActionState>;
};

export function DeliverySettingsForm({
  settings,
  action,
}: DeliverySettingsFormProps) {
  const [state, formAction, isPending] = useActionState(
    action,
    initialDeliverySettingsActionState,
  );
  const [deliveryEnabled, setDeliveryEnabled] = useState(
    settings.deliveryEnabled,
  );

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-5">
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="text-sm text-primary">
          {state.success}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">
            Entrega imediata
          </p>
          <p className="text-xs text-muted-foreground">
            Quando desligada, o checkout oferece só Sacolinha.
          </p>
        </div>
        <input
          type="hidden"
          name="deliveryEnabled"
          value={deliveryEnabled ? "true" : "false"}
        />
        <Switch
          checked={deliveryEnabled}
          onCheckedChange={setDeliveryEnabled}
          aria-label="Entrega imediata ativa"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="storePostalCode">CEP da loja</Label>
        <Input
          id="storePostalCode"
          name="storePostalCode"
          inputMode="numeric"
          defaultValue={settings.storePostalCode ?? ""}
          placeholder="85851207"
          maxLength={9}
          className="h-11"
          aria-invalid={Boolean(state.fieldErrors?.storePostalCode)}
        />
        {state.fieldErrors?.storePostalCode ? (
          <p className="text-sm text-destructive">
            {state.fieldErrors.storePostalCode}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Origem do frete (haversine). Ao salvar, geocodificamos o CEP.
          </p>
        )}
      </div>

      {settings.storeLatitude != null && settings.storeLongitude != null ? (
        <p className="rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          Coordenadas atuais: {settings.storeLatitude.toFixed(5)},{" "}
          {settings.storeLongitude.toFixed(5)}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="ratePerKm"
          label="Taxa por km (R$)"
          defaultValue={settings.ratePerKm}
          error={state.fieldErrors?.ratePerKm}
          step="0.01"
        />
        <Field
          id="multiplier"
          label="Multiplicador"
          defaultValue={settings.multiplier}
          error={state.fieldErrors?.multiplier}
          step="0.01"
        />
        <Field
          id="minAmount"
          label="Frete mínimo (R$)"
          defaultValue={settings.minAmount}
          error={state.fieldErrors?.minAmount}
          step="0.01"
        />
        <Field
          id="maxRadiusKm"
          label="Raio máximo (km)"
          defaultValue={settings.maxRadiusKm}
          error={state.fieldErrors?.maxRadiusKm}
          step="0.1"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Fórmula: frete = máx(mínimo, km × taxa × multiplicador). Fora do raio
        o checkout bloqueia a entrega.
      </p>

      <Button type="submit" className="h-11 w-full sm:w-auto" disabled={isPending}>
        {isPending ? "Salvando…" : "Salvar frete"}
      </Button>
    </form>
  );
}

function Field({
  id,
  label,
  defaultValue,
  error,
  step,
}: {
  id: string;
  label: string;
  defaultValue: number;
  error?: string;
  step: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type="number"
        inputMode="decimal"
        step={step}
        min={0}
        defaultValue={defaultValue}
        className="h-11"
        aria-invalid={Boolean(error)}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
