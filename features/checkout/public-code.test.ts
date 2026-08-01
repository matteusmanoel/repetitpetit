import { describe, expect, it } from "vitest";

import {
  formatPublicCode,
  nextPublicCode,
  parsePublicCodeSequence,
} from "@/features/checkout/public-code";

describe("public-code", () => {
  it("formata RP-YYYY-NNNN", () => {
    expect(formatPublicCode(2026, 42)).toBe("RP-2026-0042");
  });

  it("incrementa a partir do último código", () => {
    expect(nextPublicCode("RP-2026-0042", 2026)).toBe("RP-2026-0043");
  });

  it("começa em 0001 quando não há código", () => {
    expect(nextPublicCode(null, 2026)).toBe("RP-2026-0001");
  });

  it("parseia sequência do ano", () => {
    expect(parsePublicCodeSequence("RP-2026-0007", 2026)).toBe(7);
    expect(parsePublicCodeSequence("RP-2025-0007", 2026)).toBeNull();
  });
});
