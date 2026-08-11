import { describe, expect, it } from "vitest";

import { buildMockAudioFieldSuggestions } from "@/features/admin/product-audio-fields";

describe("buildMockAudioFieldSuggestions", () => {
  it("does not embed capture placeholder notes in description", () => {
    const fromKb = buildMockAudioFieldSuggestions("Áudio capturado (45 KB).");
    expect(fromKb.description).not.toMatch(/Áudio capturado/i);

    const fromPlaceholder = buildMockAudioFieldSuggestions("[áudio gravado]");
    expect(fromPlaceholder.description).not.toMatch(/Nota:/);
  });

  it("keeps useful spoken notes in fallback description", () => {
    const fields = buildMockAudioFieldSuggestions("Body Hello Kitty P 45 reais");
    expect(fields.description).toMatch(/Body Hello Kitty/);
  });
});
