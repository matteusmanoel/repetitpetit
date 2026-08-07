import type { Metadata } from "next";

import { DeliverySettingsForm } from "@/components/admin/DeliverySettingsForm";
import { updateDeliverySettingsAction } from "@/features/admin/delivery-settings/actions";
import { getAdminDeliverySettings } from "@/features/admin/delivery-settings/queries";
import { requireAdminSession } from "@/features/admin/session";

export const metadata: Metadata = {
  title: "Configurações — Admin Repeti Petit",
};

export default async function AdminConfiguracoesPage() {
  await requireAdminSession();
  const settings = await getAdminDeliverySettings();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-foreground">
          Configurações
        </h1>
        <p className="text-sm text-muted-foreground">
          Frete de entrega imediata (ViaCEP + haversine). Correios fora do
          escopo.
        </p>
      </div>

      {!settings ? (
        <p role="alert" className="text-sm text-destructive">
          Não foi possível carregar as configurações da loja.
        </p>
      ) : (
        <section className="rounded-2xl border border-border bg-card p-4 md:p-6">
          <h2 className="mb-4 text-lg font-bold text-foreground">
            Entrega imediata
          </h2>
          <DeliverySettingsForm
            settings={settings}
            action={updateDeliverySettingsAction}
          />
        </section>
      )}
    </div>
  );
}
