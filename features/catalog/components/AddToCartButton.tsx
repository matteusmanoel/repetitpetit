"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { ReservationView } from "@/features/catalog/types";

type AddToCartButtonProps = {
  productId: string;
  reservation: ReservationView;
};

type UiState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; expiresAt: string };

/**
 * CTA full-width que chama `POST /api/cart/reserve` (T13) — sem stub.
 */
export function AddToCartButton({ productId, reservation }: AddToCartButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [ui, setUi] = useState<UiState>({ status: "idle" });

  const effectiveReservation: ReservationView =
    ui.status === "success"
      ? { kind: "own", expiresAt: ui.expiresAt }
      : reservation;

  const reservedByOther = effectiveReservation.kind === "other";
  const inOwnCart = effectiveReservation.kind === "own";

  async function handleReserve() {
    setUi({ status: "idle" });

    try {
      const response = await fetch("/api/cart/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      const payload = (await response.json().catch(() => null)) as {
        reservation?: { expires_at: string };
        message?: string;
        error?: string;
      } | null;

      if (response.status === 409) {
        setUi({
          status: "error",
          message: payload?.message ?? "Esta peça não está mais disponível.",
        });
        startTransition(() => router.refresh());
        return;
      }

      if (!response.ok || !payload?.reservation?.expires_at) {
        setUi({
          status: "error",
          message: payload?.message ?? "Não foi possível reservar a peça. Tente de novo.",
        });
        return;
      }

      setUi({ status: "success", expiresAt: payload.reservation.expires_at });
      startTransition(() => router.refresh());
    } catch {
      setUi({
        status: "error",
        message: "Falha de rede ao reservar. Verifique a conexão e tente de novo.",
      });
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        size="lg"
        className="h-12 w-full rounded-full text-base font-medium"
        disabled={reservedByOther || inOwnCart || isPending}
        onClick={() => {
          void handleReserve();
        }}
      >
        {isPending
          ? "Reservando…"
          : inOwnCart
            ? "No carrinho"
            : reservedByOther
              ? "Indisponível no momento"
              : "Adicionar ao carrinho"}
      </Button>

      {ui.status === "error" ? (
        <p role="alert" className="text-sm text-destructive">
          {ui.message}
        </p>
      ) : null}
    </div>
  );
}
