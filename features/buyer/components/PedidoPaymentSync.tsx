"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

type PedidoPaymentSyncProps = {
  publicCode: string;
  /** Still awaiting payment confirmation after MP return. */
  awaitingPayment: boolean;
  /** Query `status` from Mercado Pago back_url when present. */
  mpReturnStatus: string | null;
};

type SyncPayload = {
  orderStatus: string;
  paymentStatus: string;
};

/**
 * When MP returns to `/pedido/[codigo]` (D109), poll sync until webhook/local
 * status confirms payment — then refresh the server page.
 */
export function PedidoPaymentSync({
  publicCode,
  awaitingPayment,
  mpReturnStatus,
}: PedidoPaymentSyncProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(
    awaitingPayment && Boolean(mpReturnStatus),
  );

  useEffect(() => {
    // Only poll when MP bounced back with a status query (D109 back_url).
    if (!awaitingPayment || !mpReturnStatus) {
      setVisible(false);
      return;
    }

    setVisible(true);

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 40;

    async function poll() {
      attempts += 1;
      try {
        const syncResponse = await fetch("/api/payments/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicCode }),
          cache: "no-store",
        });
        let data: SyncPayload | null = null;
        if (syncResponse.ok) {
          data = (await syncResponse.json()) as SyncPayload;
        } else {
          const statusResponse = await fetch(
            `/api/payments/status?codigo=${encodeURIComponent(publicCode)}`,
            { cache: "no-store" },
          );
          if (statusResponse.ok) {
            data = (await statusResponse.json()) as SyncPayload;
          }
        }
        if (cancelled || !data) return;
        if (
          data.paymentStatus === "paid" ||
          data.orderStatus === "paid" ||
          data.orderStatus === "confirmed" ||
          data.orderStatus === "na_sacolinha"
        ) {
          setVisible(false);
          router.refresh();
        }
      } catch {
        // keep polling
      }
    }

    void poll();
    const timer = window.setInterval(() => {
      if (attempts >= maxAttempts) {
        window.clearInterval(timer);
        if (!cancelled) setVisible(false);
        return;
      }
      void poll();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [awaitingPayment, mpReturnStatus, publicCode, router]);

  if (!visible) return null;

  return (
    <div
      role="status"
      className="mt-4 flex items-start gap-3 rounded-3xl border border-border bg-muted/40 px-4 py-3 text-left text-sm"
    >
      <Loader2 className="mt-0.5 size-5 shrink-0 animate-spin text-primary" />
      <div>
        <p className="font-medium text-foreground">
          Processando pagamento
        </p>
        <p className="mt-0.5 text-muted-foreground">
          Estamos confirmando com o Mercado Pago. O status atualiza
          automaticamente em alguns segundos.
        </p>
      </div>
    </div>
  );
}
