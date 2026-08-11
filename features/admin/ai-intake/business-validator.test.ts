import { describe, expect, it } from "vitest";

import { validateIntakeDraft } from "@/features/admin/ai-intake/business-validator";
import {
  applyCategoryMatchToDraft,
  alignTextToCanonicalBrand,
  evaluatePublishGate,
  listBrandCandidates,
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

  it("flags RN with toddler default 2_3a", () => {
    const issues = validateIntakeDraft({
      size_label: "RN",
      size_group: "2_3a",
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
  it("aliases Tommy → Tommy Hilfiger and Tip Top canonically", () => {
    expect(normalizeBrandName("Tommy")).toBe("Tommy Hilfiger");
    expect(normalizeBrandName("gap")).toBe("GAP");
    expect(normalizeBrandName("TipTop")).toBe("Tip Top");
    expect(listBrandCandidates()).toContain("Tip Top");
  });

  it("matches category case-insensitive", () => {
    const cats = [
      { id: "1", name: "Vestidos", slug: "vestidos" },
      { id: "2", name: "Bodies", slug: "bodies" },
    ];
    expect(matchCategoryByName(cats, "vestidos")?.id).toBe("1");
    expect(matchCategoryByName(cats, "Body")).toBeNull();
  });

  it("applies category match on draft without creating", () => {
    const cats = [
      { id: "1", name: "Blusas e Camisetas", slug: "blusas-e-camisetas" },
    ];
    const matched = applyCategoryMatchToDraft(
      {
        client_id: "c1",
        name: "Body",
        slug: "body",
        description: null,
        price: null,
        compare_at_price: null,
        brand: null,
        size_label: "RN",
        size_group: "rn_3m",
        gender: null,
        condition: null,
        tags: [],
        category_id: null,
        category_name: "Blusas e Camisetas",
        images: [{ image_url: "https://example.com/a.jpg" }],
        audio_note: null,
      },
      cats,
    );
    expect(matched.category_id).toBe("1");
    expect(matched.category_name).toBe("Blusas e Camisetas");

    const unmatched = applyCategoryMatchToDraft(
      { ...matched, category_id: null, category_name: "Body" },
      cats,
    );
    expect(unmatched.category_id).toBeNull();
    expect(unmatched.category_name).toBe("Body");
  });

  it("mirrors canonical category name on case-insensitive match", () => {
    const cats = [
      { id: "1", name: "Blusas e Camisetas", slug: "blusas-e-camisetas" },
    ];
    const draft = applyCategoryMatchToDraft(
      {
        client_id: "c1",
        name: "Blusa",
        slug: "blusa",
        description: null,
        price: null,
        compare_at_price: null,
        brand: null,
        size_label: "P",
        size_group: "2_3a",
        gender: null,
        condition: null,
        tags: [],
        category_id: null,
        category_name: "blusas e camisetas",
        images: [{ image_url: "https://example.com/a.jpg" }],
        audio_note: null,
      },
      cats,
    );
    expect(draft.category_id).toBe("1");
    expect(draft.category_name).toBe("Blusas e Camisetas");
  });

  it("aligns spoken TipTop in free text to Tip Top", () => {
    expect(
      alignTextToCanonicalBrand(
        "Body Tiptop rosa de manga curta",
        "Tip Top",
        "Tiptop",
      ),
    ).toBe("Body Tip Top rosa de manga curta");
    expect(
      alignTextToCanonicalBrand("Marca nova XYZ linda", "XYZ", "XYZ"),
    ).toBe("Marca nova XYZ linda");
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
