import Link from "next/link";
import { Header } from "@/components/public/Header";
import { env } from "@/lib/env";
import { checkSupabaseConnection } from "@/lib/supabase/health";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const health = await checkSupabaseConnection();

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <section className="rounded-2xl bg-primary px-6 py-10 text-primary-foreground">
          <h1 className="font-display text-3xl font-extrabold leading-tight sm:text-4xl">
            Peças únicas esperando por você
          </h1>
          <p className="mt-2 max-w-md text-primary-foreground/90">
            Marcas que você ama, preços que cabem no bolso. Escolha o tamanho e
            finalize em segundos.
          </p>
          <Link
            href="/catalogo"
            className="mt-6 inline-block rounded-xl bg-card px-5 py-2.5 text-sm font-semibold text-primary hover:opacity-90"
          >
            Ver catálogo
          </Link>
        </section>

        <section className="mt-8 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-bold">
            Status do ambiente de desenvolvimento
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Verificação em tempo real da conexão com o Supabase (feita no
            servidor a cada carregamento).
          </p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <StatusRow
              label="App Next.js"
              ok
              value={`${env.NEXT_PUBLIC_STORE_NAME} · rodando`}
            />
            <StatusRow
              label="Supabase (Auth)"
              ok={health.authOk}
              value={
                health.authOk
                  ? `conectado · projeto ${health.projectRef}`
                  : "sem conexão"
              }
            />
            <StatusRow
              label="Schema (tabela products)"
              ok={health.schemaReady}
              value={
                health.schemaReady
                  ? `aplicado · ${health.productCount ?? 0} produto(s)`
                  : "pendente (migrations não aplicadas)"
              }
            />
            <StatusRow
              label="Credenciais de ambiente"
              ok
              value="carregadas via .env.local"
            />
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">{health.detail}</p>
        </section>
      </main>
    </>
  );
}

function StatusRow({
  label,
  ok,
  value,
}: {
  label: string;
  ok: boolean;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2">
      <span
        className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
          ok ? "bg-secondary" : "bg-destructive"
        }`}
        aria-hidden
      />
      <div className="min-w-0">
        <dt className="text-sm font-medium">{label}</dt>
        <dd className="truncate text-xs text-muted-foreground">{value}</dd>
      </div>
    </div>
  );
}
