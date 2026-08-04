"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { OverrideActionButton } from "@/components/admin/OverrideActionButton";
import { PassportHoldCountdown } from "@/components/admin/PassportHoldCountdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PRODUCT_CONDITION_LABELS,
  PRODUCT_STATUS_LABELS,
  formatPriceBRL,
} from "@/features/admin/product-constants";
import { completePosSaleFromAdmin } from "@/features/pos/complete-pos-sale";
import { lookupProductForPosAction } from "@/features/pos/lookup-product-action";
import type { PosProductLookup } from "@/features/pos/lookup-product";
import type { StorePaymentMethodInput } from "@/features/pos/payment-method";
import { posSellPath, productEditPath } from "@/lib/qr/passport-url";
import { cn } from "@/lib/utils";

const PAYMENT_OPTIONS: {
  value: StorePaymentMethodInput;
  label: string;
}[] = [
  { value: "cash", label: "Dinheiro" },
  { value: "card_local", label: "Cartão" },
  { value: "pix_local", label: "Pix" },
];

type Props = {
  initialLookup: PosProductLookup | null;
  initialQuery: string;
  initialError?: string | null;
};

type SuccessState = {
  publicCode: string;
  productName: string;
};

/**
 * Mobile-first POS sell workflow (SN-08 / D86).
 * Scan-first: search by RP / paste Passport URL / deep link `?product=`.
 */
export function PosSellWorkflow({
  initialLookup,
  initialQuery,
  initialError = null,
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [lookup, setLookup] = useState<PosProductLookup | null>(initialLookup);
  const [paymentMethod, setPaymentMethod] =
    useState<StorePaymentMethodInput>("cash");
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [error, setError] = useState<string | null>(initialError);
  const [isLookingUp, startLookup] = useTransition();
  const [isSelling, startSell] = useTransition();

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    startLookup(async () => {
      const result = await lookupProductForPosAction(query);
      if (!result.ok) {
        setLookup(null);
        setError(result.error);
        return;
      }

      setLookup(result.data);
      router.replace(posSellPath(result.data.product.id), { scroll: false });
    });
  }

  function handleSell() {
    if (!lookup) return;
    setError(null);

    startSell(async () => {
      const result = await completePosSaleFromAdmin({
        productId: lookup.product.id,
        paymentMethod,
      });

      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      setSuccess({
        publicCode: result.publicCode,
        productName: lookup.product.name,
      });
      toast.success("Venda confirmada no balcão.");
      router.refresh();
    });
  }

  function handleNewSale() {
    setSuccess(null);
    setLookup(null);
    setQuery("");
    setError(null);
    setPaymentMethod("cash");
    router.replace("/admin/pos", { scroll: false });
  }

  if (success) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <SuccessCard
          publicCode={success.publicCode}
          productName={success.productName}
          onNewSale={handleNewSale}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">POS · balcão</h1>
        <p className="text-sm text-muted-foreground">
          Escaneie o QR (Passaporte → Vender) ou busque pelo código RP.
        </p>
      </header>

      <form onSubmit={handleSearch} className="flex flex-col gap-2">
        <Label htmlFor="pos-lookup" className="text-sm font-medium">
          Código RP ou URL do Passaporte
        </Label>
        <div className="flex gap-2">
          <Input
            id="pos-lookup"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="RP-000381"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className="h-11 min-h-11 flex-1 text-base"
            disabled={isLookingUp || isSelling}
          />
          <Button
            type="submit"
            className="h-11 min-h-11 min-w-24 px-4"
            disabled={isLookingUp || isSelling || !query.trim()}
          >
            {isLookingUp ? "…" : "Buscar"}
          </Button>
        </div>
      </form>

      {error ? (
        <p
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {lookup ? (
        <ProductPanel
          lookup={lookup}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          onSell={handleSell}
          isSelling={isSelling}
        />
      ) : null}

      <Button asChild variant="outline" className="h-11 w-full min-h-11">
        <Link href="/admin/produtos">Voltar para produtos</Link>
      </Button>
    </div>
  );
}

function ProductPanel({
  lookup,
  paymentMethod,
  onPaymentMethodChange,
  onSell,
  isSelling,
}: {
  lookup: PosProductLookup;
  paymentMethod: StorePaymentMethodInput;
  onPaymentMethodChange: (value: StorePaymentMethodInput) => void;
  onSell: () => void;
  isSelling: boolean;
}) {
  const { product, hold, hasPendingOnlineOrder, sellGate } = lookup;
  const canSell = sellGate === "available";
  const needsOverride =
    sellGate === "hold" || sellGate === "pending_payment";

  return (
    <section className="flex flex-col gap-3" aria-label="Peça selecionada">
      <div className="flex gap-3 rounded-xl border border-border bg-card p-3">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-muted">
          {product.coverImageUrl ? (
            <Image
              src={product.coverImageUrl}
              alt={product.name}
              fill
              className="object-cover"
              sizes="96px"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              Sem foto
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            {product.staffCode ? (
              <Badge
                variant="outline"
                className="h-7 rounded-md px-2 font-mono text-xs font-semibold"
              >
                {product.staffCode}
              </Badge>
            ) : null}
            <span className="text-base font-semibold tabular-nums">
              {formatPriceBRL(product.price)}
            </span>
          </div>
          <h2 className="text-base font-semibold leading-snug text-foreground">
            {product.name}
          </h2>
          <p className="text-sm text-muted-foreground">
            {[
              product.sizeLabel,
              PRODUCT_CONDITION_LABELS[product.condition],
              product.brand,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className="text-xs text-muted-foreground">
            Status:{" "}
            <span className="font-medium text-foreground">
              {PRODUCT_STATUS_LABELS[product.status] ?? product.status}
            </span>
          </p>
        </div>
      </div>

      {sellGate === "hold" && hold ? (
        <StatusWarning
          tone="warning"
          title="Reservado online"
          detail={
            <>
              {hold.remainingMinutes} min restantes
              <span className="mx-2 text-muted-foreground">·</span>
              <PassportHoldCountdown expiresAt={hold.expiresAt} />
            </>
          }
        />
      ) : null}

      {sellGate === "pending_payment" ? (
        <StatusWarning
          tone="warning"
          title="Pagamento online em andamento"
          detail="É preciso Override com motivo antes de vender no balcão."
        />
      ) : null}

      {sellGate === "sold_or_paid" ? (
        <StatusWarning
          tone="blocked"
          title="Já vendido / pago online."
          detail="Esta peça não pode ser vendida no balcão."
        />
      ) : null}

      {sellGate === "inactive" ? (
        <StatusWarning
          tone="blocked"
          title="Peça inativa."
          detail="Reative no cadastro antes de vender."
        />
      ) : null}

      {sellGate === "blocked" ? (
        <StatusWarning
          tone="blocked"
          title="Peça indisponível para venda no balcão."
          detail={`Status atual: ${product.status}`}
        />
      ) : null}

      {needsOverride ? (
        <OverrideActionButton
          productId={product.id}
          productStatus={product.status}
          hasPendingOnlineOrder={hasPendingOnlineOrder}
          className="h-11 w-full min-h-11"
        />
      ) : null}

      {canSell ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Forma de pagamento</Label>
            <div
              className="grid grid-cols-3 gap-2"
              role="group"
              aria-label="Forma de pagamento"
            >
              {PAYMENT_OPTIONS.map((option) => {
                const selected = paymentMethod === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onPaymentMethodChange(option.value)}
                    disabled={isSelling}
                    className={cn(
                      "inline-flex h-11 min-h-11 items-center justify-center rounded-lg border px-2 text-sm font-medium transition-colors",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:bg-muted",
                    )}
                    aria-pressed={selected}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            type="button"
            className="h-12 w-full min-h-12 text-base"
            onClick={onSell}
            disabled={isSelling}
          >
            {isSelling ? "Confirmando…" : "Confirmar venda"}
          </Button>
        </div>
      ) : null}

      <Button asChild variant="secondary" className="h-11 w-full min-h-11">
        <Link href={productEditPath(product.id)}>Ver peça no admin</Link>
      </Button>
    </section>
  );
}

function StatusWarning({
  tone,
  title,
  detail,
}: {
  tone: "warning" | "blocked";
  title: string;
  detail: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3",
        tone === "warning"
          ? "border-amber-300 bg-amber-50 text-amber-950"
          : "border-red-300 bg-red-50 text-red-900",
      )}
      role="status"
    >
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-1 flex flex-wrap items-center gap-1 text-sm opacity-90">
        {detail}
      </div>
    </div>
  );
}

function SuccessCard({
  publicCode,
  productName,
  onNewSale,
}: {
  publicCode: string;
  productName: string;
  onNewSale: () => void;
}) {
  return (
    <section
      className="flex flex-col gap-4 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-5 text-emerald-950"
      aria-live="polite"
    >
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wide opacity-80">
          Venda confirmada
        </p>
        <h2 className="text-xl font-semibold">Pedido {publicCode}</h2>
        <p className="text-sm opacity-90">{productName}</p>
      </div>

      <div className="rounded-lg border border-emerald-200 bg-white/70 px-3 py-3">
        <p className="text-xs text-muted-foreground">Código do pedido</p>
        <p className="mt-1 font-mono text-lg font-semibold tracking-wide text-foreground">
          {publicCode}
        </p>
      </div>

      <Button
        type="button"
        className="h-11 w-full min-h-11"
        onClick={onNewSale}
      >
        Nova venda
      </Button>
      <Button asChild variant="outline" className="h-11 w-full min-h-11">
        <Link href="/admin/produtos">Voltar para produtos</Link>
      </Button>
    </section>
  );
}
