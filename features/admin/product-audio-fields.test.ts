import { describe, expect, it } from "vitest";

import { buildMockAudioFieldSuggestions } from "@/features/admin/product-audio-fields";

describe("buildMockAudioFieldSuggestions", () => {
  it("returns PT-friendly fallback fields", () => {
    const fields = buildMockAudioFieldSuggestions();
    expect(fields.name).toContain("moletom");
    expect(fields.price).toBeGreaterThan(0);
    expect(fields.size_label.length).toBeGreaterThan(0);
    expect(fields.brand.length).toBeGreaterThan(0);
  });

  it("embeds audio note into description when provided", () => {
    const fields = buildMockAudioFieldSuggestions("casaco azul GAP 2 anos");
    expect(fields.description).toContain("casaco azul GAP 2 anos");
  });
});
