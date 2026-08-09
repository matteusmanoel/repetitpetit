import { describe, expect, it } from "vitest";

import { validateIntakeDraft } from "@/features/admin/ai-intake/business-validator";
import {
  evaluatePublishGate,
  matchCategoryByName,
  normalizeBrandName,
} from "@/features/admin/ai-intake/category-match";

describe("validateIntakeDraft", () => {
  it("flags RN with teen size_group", () => {
    const issues = validateIntakeDraft({
      size_label: "RN",
      size_group: "9_12a",
    });
    expect(issues.some((i) => i.code === "size_age_conflict")).toBe(true);
  });

  it("allows RN with rn_3m", () => {
    expect(
      validateIntakeDraft({ size_label: "RN", size_group: "rn_3m" }),
    ).toHaveLength(0);
  });
});

describe("normalizeBrandName / matchCategory", () => {
  it("aliases Tommy → Tommy Hilfiger", () => {
    expect(normalizeBrandName("Tommy")).toBe("Tommy Hilfiger");
    expect(normalizeBrandName("gap")).toBe("GAP");
  });

  it("matches category case-insensitive", () => {
    const cats = [
      { id: "1", name: "Vestidos", slug: "vestidos" },
      { id: "2", name: "Bodies", slug: "bodies" },
    ];
    expect(matchCategoryByName(cats, "vestidos")?.id).toBe("1");
    expect(matchCategoryByName(cats, "Body")).toBeNull();
  });
});

describe("evaluatePublishGate", () => {
  it("requires price name size photo and no conflict", () => {
    expect(
      evaluatePublishGate({
        name: "Vestido",
        price: 35,
        size_label: "P",
        images: [{ image_url: "https://example.com/a.jpg" }],
        hasConflict: false,
      }).ok,
    ).toBe(true);

    expect(
      evaluatePublishGate({
        name: "Vestido",
        price: null,
        size_label: "P",
        images: [{ image_url: "https://example.com/a.jpg" }],
        hasConflict: false,
      }).ok,
    ).toBe(false);
  });
});
