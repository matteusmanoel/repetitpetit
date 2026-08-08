import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BuyerMagicLinkForm } from "@/features/buyer/components/BuyerMagicLinkForm";
import {
  BUYER_DEFAULT_NEXT_PATH,
  sanitizeBuyerNextPath,
} from "@/features/buyer/constants";
import { getBuyerSession } from "@/features/buyer/session";

export const metadata: Metadata = {
  title: "Entrar — Repeti Petit",
  description: "Acesse sua Sacolinha com um link no e-mail — sem senha.",
};

type PageProps = {
  searchParams: Promise<{ next?: string; erro?: string; email?: string }>;
};

/**
 * Soft entry for buyer magic link (SO-03). Not `/admin/login`.
 * Pedido público continua acessível sem passar por aqui (D103).
 */
export default async function EntrarCompradorPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const next = sanitizeBuyerNextPath(
    params.next ?? BUYER_DEFAULT_NEXT_PATH,
  );
  const session = await getBuyerSession();

  if (session) {
    redirect(next);
  }

  const linkError = params.erro === "link";

  return (
    <div className="mx-auto w-full max-w-md flex-1 px-4 py-10 sm:px-8 sm:py-14">
      <p className="text-sm font-medium text-primary">Repeti Petit</p>
      <h1 className="font-display mt-2 text-3xl text-foreground">
        Entrar na Sacolinha
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enviamos um link mágico no seu e-mail — sem senha. Use o mesmo e-mail
        do pedido para ver as peças aguardando retirada.
      </p>

      {linkError ? (
        <p
          role="alert"
          className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-foreground"
        >
          Não foi possível validar o link. Solicite um novo abaixo.
        </p>
      ) : null}

      <BuyerMagicLinkForm
        className="mt-6"
        defaultEmail={params.email ?? ""}
        nextPath={next}
      />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Prefere só acompanhar um pedido?{" "}
        <Link href="/catalogo" className="font-medium text-primary underline-offset-4 hover:underline">
          Continuar comprando
        </Link>
      </p>
    </div>
  );
}
