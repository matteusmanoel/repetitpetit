"use client";

import { useEffect, useState } from "react";

import { formatCountdown, isReservationExpired } from "@/features/cart/countdown";
import { cn } from "@/lib/utils";

const URGENT_THRESHOLD_MS = 5 * 60 * 1000;

type Props = {
  expiresAt: string;
  className?: string;
};

/**
 * Live MM:SS countdown for Passport hold status bar (SN-11).
 * Mirrors cart countdown semantics without cart store coupling.
 */
export function PassportHoldCountdown({ expiresAt, className }: Props) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const expired = isReservationExpired(expiresAt, nowMs);
  const remaining = new Date(expiresAt).getTime() - nowMs;
  const urgent = !expired && remaining <= URGENT_THRESHOLD_MS;
  const label = expired ? "00:00" : formatCountdown(expiresAt, nowMs);

  return (
    <span
      className={cn(
        "font-mono text-lg font-semibold tabular-nums",
        expired || urgent ? "text-destructive" : "text-amber-900",
        className,
      )}
      aria-label={`Tempo restante do hold: ${label}`}
    >
      {label}
    </span>
  );
}
