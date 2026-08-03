import Image from "next/image";
import Link from "next/link";

import { PassportHoldCountdown } from "@/components/admin/PassportHoldCountdown";
import { PassportQuickActions } from "@/components/admin/PassportQuickActions";
import { Badge } from "@/components/ui/badge";
import {
  PRODUCT_CONDITION_LABELS,
  PRODUCT_STATUS_LABELS,
  formatPriceBRL,
} from "@/features/admin/product-constants";
import {
  holdSessionBrowserLabel,
  saleChannelLabel,
} from "@/features/passport/channel-label";
import { PassportHistory } from "@/features/passport/components/PassportHistory";
import { paymentMethodLabel } from "@/features/passport/format-history";
import { getPassportQuickActions } from "@/features/passport/quick-actions";
import type { PassportData } from "@/features/passport/types";
import { cn } from "@/lib/utils";

type Props = {
  data: PassportData;
};

const STATUS_BAR: Record<
  string,
  { bar: string; label: string; text: string }
> = {
  available: {
    bar: "bg-emerald-100 border-emerald-300",
    label: "Disponível",
    text: "text-emerald-900",
  },
  hold: {
    bar: "bg-amber-100 border-amber-300",
    label: "Em hold",
    text: "text-amber-950",
  },
  sold: {
    bar: "bg-red-100 border-red-300",
    label: "Vendido",
    text: "text-red-900",
  },
  inactive: {
    bar: "bg-zinc-100 border-zinc-300",
    label: "Inativo",
    text: "text-zinc-800",
  },
};

function formatSoldAt(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

/**
 * Mobile-first Garment Passport body (SN-11 / D73).
 * Status bar + quick actions stay above the fold at 375px.
 */
export function GarmentPassport({ data }: Props) {
  const { product, hold, sale, history } = data;
  const staffCode = product.staff_code ?? "—";
  const primaryImage =
    product.product_images[0]?.image_url ?? product.cover_image_url;
  const statusStyle = STATUS_BAR[product.status] ?? STATUS_BAR.inactive;
  const actions = getPassportQuickActions(product.status);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      {/* Identity header */}
      <section className="flex flex-col gap-3">
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-muted">
          {primaryImage ? (
            <Image
              src={primaryImage}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 448px) 100vw, 448px"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Sem foto
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="h-7 rounded-md px-2.5 font-mono text-sm font-semibold tracking-wide"
            >
              {staffCode}
            </Badge>
            <span className="text-lg font-semibold tabular-nums text-foreground">
              {formatPriceBRL(product.price)}
            </span>
          </div>
          <h1 className="text-xl font-semibold leading-snug text-foreground">
            {product.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {[
              product.brand,
              product.size_label,
              PRODUCT_CONDITION_LABELS[product.condition],
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </section>

      {/* Status bar — above-the-fold priority */}
      <section
        className={cn(
          "rounded-xl border px-4 py-3",
          statusStyle.bar,
          statusStyle.text,
        )}
        aria-live="polite"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium uppercase tracking-wide opacity-80">
              Status
            </span>
            <span className="text-base font-semibold">
              {statusStyle.label ?? PRODUCT_STATUS_LABELS[product.status]}
            </span>
          </div>
          {product.status === "hold" && hold ? (
            <PassportHoldCountdown expiresAt={hold.expiresAt} />
          ) : null}
        </div>
        {product.status === "hold" && hold ? (
          <p className="mt-1 text-sm opacity-90">
            Hold Session de {holdSessionBrowserLabel(hold.sessionId)}
          </p>
        ) : null}
        {product.status === "sold" && product.sold_channel ? (
          <p className="mt-1 text-sm opacity-90">
            Canal: {saleChannelLabel(product.sold_channel)}
          </p>
        ) : null}
      </section>

      {/* Quick actions */}
      <section aria-label="Ações rápidas">
        <PassportQuickActions
          productId={product.id}
          productName={product.name}
          actions={actions}
        />
      </section>

      {/* Hold detail */}
      {product.status === "hold" && hold ? (
        <section
          id="passport-hold"
          className="scroll-mt-4 rounded-xl border border-border bg-card px-4 py-3"
        >
          <h2 className="text-sm font-semibold text-foreground">
            Detalhe do hold
          </h2>
          <dl className="mt-2 grid gap-1.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Sessão</dt>
              <dd className="font-mono text-foreground">
                {holdSessionBrowserLabel(hold.sessionId)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Expira em</dt>
              <dd className="tabular-nums text-foreground">
                {formatSoldAt(hold.expiresAt)}
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-muted-foreground">
            Override (SN-13) cancela o hold com auditoria antes de vender no
            balcão.
          </p>
        </section>
      ) : null}

      {/* Sale detail (D65) */}
      {product.status === "sold" ? (
        <section
          id="passport-sale"
          className="scroll-mt-4 rounded-xl border border-border bg-card px-4 py-3"
        >
          <h2 className="text-sm font-semibold text-foreground">
            Detalhe da venda
          </h2>
          {sale ? (
            <dl className="mt-2 grid gap-1.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Pedido</dt>
                <dd className="font-mono font-medium text-foreground">
                  <Link
                    href="/admin/pedidos"
                    className="underline-offset-2 hover:underline"
                  >
                    {sale.publicCode}
                  </Link>
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Canal</dt>
                <dd className="text-foreground">
                  {saleChannelLabel(sale.channel)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Pagamento</dt>
                <dd className="text-foreground">
                  {paymentMethodLabel(sale.paymentMethod)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Data</dt>
                <dd className="tabular-nums text-foreground">
                  {formatSoldAt(sale.soldAt)}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Venda registrada no inventário, sem pedido vinculado encontrado.
            </p>
          )}
        </section>
      ) : null}

      {/* Status timeline (SN-15) */}
      <section aria-label="Histórico de status" className="pb-2">
        <PassportHistory events={history} />
      </section>
    </div>
  );
}
