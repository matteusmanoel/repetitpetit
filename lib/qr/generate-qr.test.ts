import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  buildPassportUrl,
  overridePath,
  posSellPath,
  productEditPath,
  productLabelPdfPath,
  productLabelPrintPath,
} from "@/lib/qr/passport-url";

vi.mock("server-only", () => ({}));

describe("buildPassportUrl", () => {
  it("builds Passport deep link from site URL + staff_code", () => {
    expect(
      buildPassportUrl("https://repetipetit.com.br", "RP-000381"),
    ).toBe("https://repetipetit.com.br/admin/passport/RP-000381");
  });

  it("strips trailing slash from site URL", () => {
    expect(
      buildPassportUrl("https://repetipetit.com.br/", "RP-000001"),
    ).toBe("https://repetipetit.com.br/admin/passport/RP-000001");
  });

  it("encodes staff_code for the path segment", () => {
    expect(buildPassportUrl("https://example.com", "RP-000 1")).toBe(
      "https://example.com/admin/passport/RP-000%201",
    );
  });
});

describe("product label paths", () => {
  it("builds PDF and print paths", () => {
    expect(productLabelPdfPath("abc-123")).toBe(
      "/admin/produto/abc-123/label.pdf",
    );
    expect(productLabelPrintPath("abc-123")).toBe(
      "/admin/produto/abc-123/etiqueta",
    );
  });

  it("builds Passport follow-on deep links (SN-11 stubs)", () => {
    expect(posSellPath("abc-123")).toBe("/admin/pos?product=abc-123");
    expect(overridePath("abc-123")).toBe("/admin/override?product=abc-123");
    expect(productEditPath("abc-123")).toBe("/admin/produtos?edit=abc-123");
  });
});

describe("generateQRCodeSVG", () => {
  let generateQRCodeSVG: typeof import("@/lib/qr/generate-qr").generateQRCodeSVG;

  beforeAll(async () => {
    ({ generateQRCodeSVG } = await import("@/lib/qr/generate-qr"));
  });

  it("returns a valid SVG string for a Passport URL", async () => {
    const url = buildPassportUrl("https://repetipetit.com.br", "RP-000381");
    const svg = await generateQRCodeSVG(url);

    expect(svg).toMatch(/^<svg[\s>]/g);
    expect(svg).toContain("</svg>");
    expect(svg.length).toBeGreaterThan(100);
  });
});
