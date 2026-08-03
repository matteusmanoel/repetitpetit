"use client";

import { useEffect, useState } from "react";

import { minutesRemaining } from "@/features/catalog/reservation-time";
import type { ReservationView } from "@/features/catalog/types";

type ReservationIndicatorProps = {
  reservation: ReservationView;
};

/**
 * Indicador de reserva ativa na PDP (docs/05-ux-direction.md).
 */
export function ReservationIndicator({ reservation }: ReservationIndicatorProps) {
  if (reservation.kind === "none") {
    return null;
  }

  if (reservation.kind === "other") {
    return (
      <p
        role="status"
        className="rounded-lg bg-muted px-3 py-2.5 text-sm text-muted-foreground"
      >
        Reservado por outro comprador — liberado se não finalizar a compra
      </p>
    );
  }

  return <OwnReservationStatus expiresAt={reservation.expiresAt} />;
}

function OwnReservationStatus({ expiresAt }: { expiresAt: string }) {
  const [minutes, setMinutes] = useState(() => minutesRemaining(expiresAt));
  const [trackedExpiresAt, setTrackedExpiresAt] = useState(expiresAt);

  if (trackedExpiresAt !== expiresAt) {
    setTrackedExpiresAt(expiresAt);
    setMinutes(minutesRemaining(expiresAt));
  }

  useEffect(() => {
    const id = window.setInterval(() => {
      setMinutes(minutesRemaining(expiresAt));
    }, 15_000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  if (minutes <= 0) {
    return (
      <p role="status" className="rounded-lg bg-muted px-3 py-2.5 text-sm text-muted-foreground">
        Sua reserva expirou — você pode tentar adicionar de novo.
      </p>
    );
  }

  return (
    <p
      role="status"
      className="rounded-lg bg-secondary/15 px-3 py-2.5 text-sm font-medium text-foreground"
    >
      Reservada para você — {minutes}min restantes
    </p>
  );
}
