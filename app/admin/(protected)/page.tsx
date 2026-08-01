import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Painel administrativo — Repeti Petit",
};

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-extrabold text-foreground">
          Painel administrativo
        </h1>
        <p className="text-sm text-muted-foreground">
          A fila de pedidos chega nas próximas etapas. Enquanto isso, gerencie
          o catálogo de peças.
        </p>
      </div>
      <div>
        <Button asChild>
          <Link href="/admin/produtos">Ir para produtos</Link>
        </Button>
      </div>
    </div>
  );
}
