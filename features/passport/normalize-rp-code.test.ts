import { describe, expect, it } from "vitest";

import { normalizePassportRpCode } from "@/features/passport/normalize-rp-code";
import { getPassportQuickActions } from "@/features/passport/quick-actions";
import {
  holdSessionBrowserLabel,
  saleChannelLabel,
} from "@/features/passport/channel-label";
import {
  buildPassportUrl,
  overridePath,
  posSellPath,
  productEditPath,
  productLabelPdfPath,
} from "@/lib/qr/passport-url";

describe("normalizePassportRpCode", () => {
  it("trims and uppercases RP codes", () => {
    expect(normalizePassportRpCode(" rp-000381 ")).toBe("RP-000381");
  });

  it("decodes URI path segments", () => {
    expect(normalizePassportRpCode("RP-000%20381")).toBe("RP-000 381");
  });

  it("returns empty for blank input", () => {
    expect(normalizePassportRpCode("   ")).toBe("");
  });
});

describe("getPassportQuickActions", () => {
  it("does not offer Sell on sold products", () => {
    const ids = getPassportQuickActions("sold").map((a) => a.id);
    expect(ids).toEqual(["view_sale", "reprint"]);
    expect(ids).not.toContain("sell");
  });

  it("offers Sell + Archive on available", () => {
    const ids = getPassportQuickActions("available").map((a) => a.id);
    expect(ids).toEqual(["sell", "edit", "archive"]);
  });

  it("offers Override before Sell on hold", () => {
    const ids = getPassportQuickActions("hold").map((a) => a.id);
    expect(ids[0]).toBe("override");
    expect(ids).toContain("sell");
  });

  it("offers Reativar on inactive", () => {
    const ids = getPassportQuickActions("inactive").map((a) => a.id);
    expect(ids).toEqual(["reactivate", "edit"]);
  });
});

describe("passport deep-link helpers", () => {
  it("keeps Passport URL shape from D81", () => {
    expect(buildPassportUrl("https://repetipetit.com.br", "RP-000381")).toBe(
      "https://repetipetit.com.br/admin/passport/RP-000381",
    );
  });

  it("builds POS / override / edit / reprint paths", () => {
    expect(posSellPath("abc")).toBe("/admin/pos?product=abc");
    expect(overridePath("abc")).toBe("/admin/override?product=abc");
    expect(productEditPath("abc")).toBe("/admin/produtos?edit=abc");
    expect(productLabelPdfPath("abc")).toBe("/admin/produto/abc/label.pdf");
  });
});

describe("passport labels", () => {
  it("maps sale channels", () => {
    expect(saleChannelLabel("online")).toBe("Online");
    expect(saleChannelLabel("store")).toBe("Loja física");
  });

  it("shortens long hold session ids", () => {
    expect(holdSessionBrowserLabel("abcdefghijklmnop")).toBe("abcdefgh…");
  });
});
