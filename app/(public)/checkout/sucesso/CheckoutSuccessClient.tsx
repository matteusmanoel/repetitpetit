"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { formatPrice } from "@/features/catalog/format-price";
import { startMercadoPagoPaymentAction } from "@/features/payments/actions";

type CheckoutSuccessClientProps = {
  publicCode: string;
  initialOrderStatus: string;
  initialPaymentStatus: string;
  totalAmount: number;
  /** Query `status` devolvida pelo MP no back_url (approved/pending/rejected…). */
  mpReturnStatus: string | null;
};

type PollState =
  | "processing"
  | "paid"
  | "failed"
  | "pending_return"
  | "timed_out";

function deriveState(
  orderStatus: string,
  paymentStatus: string,
  mpReturnStatus: string | null,
  timedOut: boolean,
): PollState {
  if (paymentStatus === "paid" || orderStatus === "paid") {
    return "paid";
  }
  if (
    paymentStatus === "failed" ||
    paymentStatus === "cancelled" ||
    mpReturnStatus === "rejected" ||
    mpReturnStatus === "cancelled"
  ) {
    return "failed";
  }
  if (timedOut) {
    return "timed_out";
  }
  if (mpReturnStatus === "pending" || mpReturnStatus === "in_process") {
    return "pending_return";
  }
  return "processing";
}

type SyncOrStatusPayload = {
  orderStatus: string;
  paymentStatus: string;
  confirmed?: boolean;
};

/**
 * D46: sync puxa o estado no MP (cobre webhook perdido/401).
 * Fallback: status local se ainda não houver pagamento no MP.
 */
async function fetchPaymentUpdate(
  publicCode: string,
): Promise<SyncOrStatusPayload | null> {
  try {
    const syncResponse = await fetch("/api/payments/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicCode }),
      cache: "no-store",
    });
    if (syncResponse.ok) {
      return (await syncResponse.json()) as SyncOrStatusPayload;
    }
  } catch {
    // tenta status local abaixo
  }

  try {
    const statusResponse = await fetch(
      `/api/payments/status?codigo=${encodeURIComponent(publicCode)}`,
      { cache: "no-store" },
    );
    if (!statusResponse.ok) return null;
    return (await statusResponse.json()) as SyncOrStatusPayload;
  } catch {
    return null;
  }
}

export function CheckoutSuccessClient({
  publicCode,
  initialOrderStatus,
  initialPaymentStatus,
  totalAmount,
  mpReturnStatus,
}: CheckoutSuccessClientProps) {
  const [orderStatus, setOrderStatus] = useState(initialOrderStatus);
  const [paymentStatus, setPaymentStatus] = useState(initialPaymentStatus);
  const [timedOut, setTimedOut] = useState(false);
  const [retryPending, setRetryPending] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const state = deriveState(
    orderStatus,
    paymentStatus,
    mpReturnStatus,
    timedOut,
  );

  useEffect(() => {
    if (state === "paid" || state === "failed" || state === "timed_out") return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 40; // ~2 min com intervalo de 3s

    async function poll() {
      attempts += 1;
      const data = await fetchPaymentUpdate(publicCode);
      if (cancelled || !data) return;
      setOrderStatus(data.orderStatus);
      setPaymentStatus(data.paymentStatus);
      if (data.paymentStatus === "paid" || data.orderStatus === "paid") {
        setTimedOut(false);
      }
    }

    void poll();
    const timer = window.setInterval(() => {
      if (attempts >= maxAttempts) {
        window.clearInterval(timer);
        if (!cancelled) setTimedOut(true);
        return;
      }
      void poll();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [publicCode, state]);

  async function handleRetryPay() {
    setRetryError(null);
    setRetryPending(true);
    const result = await startMercadoPagoPaymentAction(publicCode);
    if (!result.success) {
      setRetryPending(false);
      setRetryError(result.error);
      return;
    }
    window.location.assign(result.initPoint);
  }

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-8 sm:px-8 sm:py-12">
      <p className="text-sm font-medium text-primary">Repeti Petit</p>
      <h1 className="font-heading mt-1 text-2xl font-extrabold text-foreground">
        Pedido {publicCode}
      </h1>

      <div className="mt-6 rounded-2xl border border-border p-5">
        {state === "paid" ? (
          <StatusBlock
            icon={<CheckCircle2 className="size-8 text-primary" />}
            title="Pagamento confirmado"
            body="Recebemos a confirmação do Mercado Pago. Em breve a loja separa suas peças."
          />
        ) : null}

        {state === "failed" ? (
          <StatusBlock
            icon={<XCircle className="size-8 text-destructive" />}
            title="Pagamento não concluído"
            body="O Mercado Pago não aprovou o pagamento. Você pode tentar de novo com PIX ou cartão."
          />
        ) : null}

        {state === "timed_out" ? (
          <StatusBlock
            icon={<Loader2 className="size-8 text-muted-foreground" />}
            title="Ainda não confirmamos o pagamento"
            body="O Mercado Pago pode demorar um pouco. Atualize a página ou abra o pedido — se o pagamento já foi aprovado, a confirmação aparece assim que sincronizarmos."
          />
        ) : null}

        {(state === "processing" || state === "pending_return") && (
          <StatusBlock
            icon={
              <Loader2 className="size-8 animate-spin text-primary" />
            }
            title={
              state === "pending_return"
                ? "Pagamento em processamento"
                : "Processando pagamento"
            }
            body={
              state === "pending_return"
                ? "Seu PIX ou cartão ainda está sendo processado. Assim que o Mercado Pago confirmar, atualizamos o pedido automaticamente."
                : "Estamos aguardando a confirmação do Mercado Pago. Isso pode levar alguns segundos — não feche esta página."
            }
          />
        )}

        <dl className="mt-5 flex flex-col gap-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Total</dt>
            <dd className="font-heading font-bold text-primary">
              {formatPrice(totalAmount)}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Status do pedido</dt>
            <dd className="font-medium text-foreground">
              {labelOrderStatus(orderStatus)}
            </dd>
          </div>
        </dl>
      </div>

      {retryError ? (
        <p role="alert" className="mt-4 text-sm font-medium text-destructive">
          {retryError}
        </p>
      ) : null}

      <div className="mt-8 flex flex-col gap-2">
        {state === "failed" ||
        state === "processing" ||
        state === "pending_return" ||
        state === "timed_out" ? (
          <button
            type="button"
            disabled={retryPending}
            onClick={() => void handleRetryPay()}
            className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {retryPending ? "Abrindo Mercado Pago…" : "Pagar com Mercado Pago"}
          </button>
        ) : null}

        <Link
          href={`/pedido/${publicCode}`}
          className="inline-flex h-11 items-center justify-center rounded-full border border-border px-6 text-sm font-medium text-foreground hover:bg-muted"
        >
          Ver pedido
        </Link>
        <Link
          href="/catalogo"
          className="inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-medium text-foreground hover:bg-muted"
        >
          Continuar comprando
        </Link>
      </div>
    </div>
  );
}

function StatusBlock({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-start gap-3">
      {icon}
      <div>
        <p className="font-heading text-lg font-bold text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

function labelOrderStatus(status: string): string {
  switch (status) {
    case "pending_payment":
      return "Aguardando pagamento";
    case "paid":
      return "Pago";
    case "confirmed":
      return "Confirmado";
    case "expired":
      return "Expirado";
    case "cancelled":
      return "Cancelado";
    default:
      return status;
  }
}
