import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Painel administrativo — Repeti Petit",
};

const SHORTCUTS = [
  {
    href: "/admin/produtos",
    title: "Produtos",
    description: "Cadastre, edite e desative peças do catálogo.",
  },
  {
    href: "/admin/categorias",
    title: "Categorias",
    description: "Gerencie as categorias da vitrine e da home.",
  },
  {
    href: "/admin/banners",
    title: "Banners",
    description: "Controle os banners ativos na página inicial.",
  },
] as const;

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-extrabold text-foreground">
          Painel administrativo
        </h1>
        <p className="text-sm text-muted-foreground">
          A fila de pedidos chega nas próximas etapas. Enquanto isso, gerencie
          o catálogo, categorias e banners.
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SHORTCUTS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="block rounded-lg border border-border bg-card px-4 py-4 transition-colors hover:border-primary/40 hover:bg-muted/40"
            >
              <p className="font-heading text-base font-extrabold text-foreground">
                {item.title}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
