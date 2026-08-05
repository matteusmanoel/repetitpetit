import { describe, expect, it } from "vitest";

import {
  isHoldAvailableTransition,
  shouldRefreshCatalogForProductChange,
  toastMessageForHoldAvailabilityChange,
} from "./catalog-realtime";

describe("isHoldAvailableTransition", () => {
  it("detecta hold → available e available → hold", () => {
    expect(isHoldAvailableTransition("hold", "available")).toBe(true);
    expect(isHoldAvailableTransition("available", "hold")).toBe(true);
  });

  it("ignora mesma status ou irrelevantes", () => {
    expect(isHoldAvailableTransition("hold", "hold")).toBe(false);
    expect(isHoldAvailableTransition("available", "sold")).toBe(false);
    expect(isHoldAvailableTransition(null, "hold")).toBe(false);
  });
});

describe("toastMessageForHoldAvailabilityChange", () => {
  it("retorna copy PT-BR", () => {
    expect(toastMessageForHoldAvailabilityChange("hold", "available")).toBe(
      "Peça disponível de novo",
    );
    expect(toastMessageForHoldAvailabilityChange("available", "hold")).toBe(
      "Peça reservada",
    );
  });
});

describe("shouldRefreshCatalogForProductChange", () => {
  it("refresh em hold↔available", () => {
    expect(
      shouldRefreshCatalogForProductChange(
        { id: "p1", status: "available" },
        { id: "p1", status: "hold" },
      ),
    ).toBe(true);
  });

  it("refresh quando peça sai da vitrine (sold)", () => {
    expect(
      shouldRefreshCatalogForProductChange(
        { id: "p1", status: "hold" },
        { id: "p1", status: "sold" },
      ),
    ).toBe(true);
  });

  it("não refresh sem id ou mudança irrelevante", () => {
    expect(
      shouldRefreshCatalogForProductChange(
        { id: "p1", status: "available" },
        { id: "p1", status: "available" },
      ),
    ).toBe(false);
    expect(
      shouldRefreshCatalogForProductChange(
        { status: "available" },
        { status: "hold" },
      ),
    ).toBe(false);
  });
});
