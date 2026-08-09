import { describe, expect, it } from "vitest";

import {
  centsToDecimalString,
  digitsOnly,
  digitsOnlyCpf,
  formatCentsBr,
  formatCpfBr,
  parseCurrencyDigitsToCents,
  reaisToCents,
} from "@/lib/br-masks";

describe("digitsOnly", () => {
  it("remove não-dígitos", () => {
    expect(digitsOnly("R$ 1.234,56")).toBe("123456");
  });
});

describe("currency cents", () => {
  it("reaisToCents arredonda", () => {
    expect(reaisToCents(55)).toBe(5500);
    expect(reaisToCents(55.5)).toBe(5550);
    expect(reaisToCents(10.999)).toBe(1100);
  });

  it("parseCurrencyDigitsToCents progressivo", () => {
    expect(parseCurrencyDigitsToCents("")).toBeNull();
    expect(parseCurrencyDigitsToCents("1")).toBe(1);
    expect(parseCurrencyDigitsToCents("12")).toBe(12);
    expect(parseCurrencyDigitsToCents("123")).toBe(123);
    expect(parseCurrencyDigitsToCents("1234")).toBe(1234);
    expect(parseCurrencyDigitsToCents("000")).toBe(0);
  });

  it("formatCentsBr e decimal string", () => {
    expect(formatCentsBr(1)).toBe("0,01");
    expect(formatCentsBr(1234)).toBe("12,34");
    expect(formatCentsBr(123456)).toBe("1.234,56");
    expect(centsToDecimalString(5500)).toBe("55.00");
    expect(centsToDecimalString(0)).toBe("0.00");
  });
});

describe("formatCpfBr", () => {
  it("máscara progressiva", () => {
    expect(formatCpfBr("1")).toBe("1");
    expect(formatCpfBr("123")).toBe("123");
    expect(formatCpfBr("1234")).toBe("123.4");
    expect(formatCpfBr("12345678901")).toBe("123.456.789-01");
  });

  it("digitsOnlyCpf limita 11", () => {
    expect(digitsOnlyCpf("123.456.789-01111")).toBe("12345678901");
  });
});
