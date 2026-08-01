import Link from "next/link";

import { env } from "@/lib/env";
import { getWhatsAppUrl } from "@/lib/whatsapp";

export default function PedidoNotFound() {
  const whatsappNumber = env.NEXT_PUBLIC_STORE_WHATSAPP;
  const supportHref = whatsappNumber
    ? getWhatsAppUrl(whatsappNumber, "Oi, preciso de ajuda com um pedido!")
    : null;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="font-heading text-2xl font-extrabold text-foreground">
        Pedido não encontrado
      </h1>
      <p className="text-sm text-muted-foreground">
        Confira o código ou fale com a loja pelo WhatsApp.
      </p>
      <div className="flex w-full max-w-xs flex-col gap-2">
        {supportHref ? (
          <a
            href={supportHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center rounded-full bg-[#25D366] px-6 text-sm font-medium text-white"
          >
            Falar no WhatsApp
          </a>
        ) : null}
        <Link
          href="/catalogo"
          className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground"
        >
          Ver catálogo
        </Link>
      </div>
    </div>
  );
}
