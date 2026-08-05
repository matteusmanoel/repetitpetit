import { describe, expect, it } from "vitest";

import { resolvePdpPurchaseState } from "./pdp-purchase-state";

describe("resolvePdpPurchaseState — dona vs outra sessão", () => {
  it("dona do Hold: own_hold com expiresAt (countdown + Finalizar + Liberar)", () => {
    expect(
      resolvePdpPurchaseState({
        productStatus: "hold",
        reservation: {
          kind: "own",
          expiresAt: "2026-08-05T12:00:00.000Z",
        },
      }),
    ).toEqual({
      mode: "own_hold",
      expiresAt: "2026-08-05T12:00:00.000Z",
    });
  });

  it("outra sessão em peça hold: reserved_by_other (sem TTL alheio)", () => {
    expect(
      resolvePdpPurchaseState({
        productStatus: "hold",
        reservation: { kind: "other" },
      }),
    ).toEqual({ mode: "reserved_by_other" });
  });

  it("peça hold sem reserva ativa detectável: reserved_by_other", () => {
    expect(
      resolvePdpPurchaseState({
        productStatus: "hold",
        reservation: { kind: "none" },
      }),
    ).toEqual({ mode: "reserved_by_other" });
  });

  it("available + reserva de outra (legado): reserved_by_other", () => {
    expect(
      resolvePdpPurchaseState({
        productStatus: "available",
        reservation: { kind: "other" },
      }),
    ).toEqual({ mode: "reserved_by_other" });
  });

  it("available sem reserva: available (Comprar Agora)", () => {
    expect(
      resolvePdpPurchaseState({
        productStatus: "available",
        reservation: { kind: "none" },
      }),
    ).toEqual({ mode: "available" });
  });

  it("sold/inactive: unavailable", () => {
    expect(
      resolvePdpPurchaseState({
        productStatus: "sold",
        reservation: { kind: "none" },
      }),
    ).toEqual({ mode: "unavailable" });
  });
});
