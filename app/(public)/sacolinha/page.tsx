import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { formatPrice } from "@/features/catalog/format-price";
import { signOutBuyerToEntrarAction } from "@/features/buyer/actions";
import { listSacolinhaPanelItems } from "@/features/buyer/sacolinha";
import { requireBuyerSession } from "@/features/buyer/session";

export const metadata: Metadata = {
  title: "Minha Sacolinha",
  description: "Peças pagas aguardando retirada na Repeti Petit.",
};

/**
 * Painel mínimo da Sacolinha do comprador (SO-03 / D103).
 * Exige sessão comprador (customers.auth_user_id) — não admin.
 */
export default async function SacolinhaPanelPage() {
  const session = await requireBuyerSession("/sacolinha");
  const items = await listSacolinhaPanelItems(session.customer.id);

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-10 sm:px-8 sm:py-12">
      <p className="text-sm font-medium text-primary">Repeti Petit</p>
      <h1 className="font-display mt-2 text-3xl text-foreground">
        Minha Sacolinha
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Olá, {session.customer.full_name.split(" ")[0]} — peças pagas em
        separação ou prontas para retirada.
      </p>

      {items.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-border px-5 py-8 text-center">
          <p className="text-sm font-medium text-foreground">
            Nenhuma peça aguardando retirada
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Quando um pedido for pago, as peças aparecem aqui.
          </p>
          <Link
            href="/catalogo"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground"
          >
            Ver catálogo
          </Link>
        </div>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {items.map((item) => (
            <li
              key={item.orderItemId}
              className="flex gap-3 rounded-3xl border border-border p-3 text-left"
            >
              <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-muted">
                {item.coverImageUrl ? (
                  <Image
                    src={item.coverImageUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">
                  {item.productName}
                </p>
                <p className="mt-0.5 text-sm font-medium text-primary">
                  {formatPrice(item.unitPrice)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.orderStatusLabel} · {item.fulfillmentLabel}
                </p>
                <Link
                  href={`/pedido/${item.publicCode}`}
                  className="mt-1 inline-block text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  Pedido {item.publicCode}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form action={signOutBuyerToEntrarAction} className="mt-10">
        <button
          type="submit"
          className="inline-flex h-11 w-full items-center justify-center rounded-full px-6 text-sm font-medium text-foreground hover:bg-muted"
        >
          Sair
        </button>
      </form>
    </div>
  );
}
