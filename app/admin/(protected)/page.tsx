import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Painel administrativo — Repeti Petit",
};

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-heading text-2xl font-extrabold text-foreground">
        Painel administrativo
      </h1>
      <p className="text-sm text-muted-foreground">
        A fila de pedidos e os atalhos de gestão chegam nas próximas etapas.
        Por enquanto, este é o shell autenticado do admin.
      </p>
    </div>
  );
}
