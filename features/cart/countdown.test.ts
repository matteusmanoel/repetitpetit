import { describe, expect, it } from "vitest";

import { formatCountdown, isReservationExpired } from "@/features/cart/countdown";

describe("formatCountdown", () => {
  it("formats remaining time as MM:SS", () => {
    const now = Date.parse("2026-08-01T12:00:00.000Z");
    const expiresAt = "2026-08-01T12:12:34.000Z";

    expect(formatCountdown(expiresAt, now)).toBe("12:34");
  });

  it("returns 00:00 when expired", () => {
    const now = Date.parse("2026-08-01T12:20:00.000Z");
    const expiresAt = "2026-08-01T12:00:00.000Z";

    expect(formatCountdown(expiresAt, now)).toBe("00:00");
  });

  it("pads single-digit minutes and seconds", () => {
    const now = Date.parse("2026-08-01T12:00:00.000Z");
    const expiresAt = "2026-08-01T12:01:05.000Z";

    expect(formatCountdown(expiresAt, now)).toBe("01:05");
  });
});

describe("isReservationExpired", () => {
  it("is true at or after expiresAt", () => {
    const expiresAt = "2026-08-01T12:00:00.000Z";

    expect(isReservationExpired(expiresAt, Date.parse("2026-08-01T12:00:00.000Z"))).toBe(
      true,
    );
    expect(isReservationExpired(expiresAt, Date.parse("2026-08-01T12:00:01.000Z"))).toBe(
      true,
    );
  });

  it("is false before expiresAt", () => {
    expect(
      isReservationExpired(
        "2026-08-01T12:00:00.000Z",
        Date.parse("2026-08-01T11:59:59.000Z"),
      ),
    ).toBe(false);
  });
});
