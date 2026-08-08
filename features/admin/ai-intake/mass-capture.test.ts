import { describe, expect, it } from "vitest";

import {
  allIntakeDraftsReady,
  isHoldLockPointer,
  isIntakeDraftReady,
  resolveHoldLockHint,
  shouldCancelOnRelease,
  shouldLockFromDelta,
} from "@/features/admin/ai-intake/mass-capture";
import { emptyIntakeDraft } from "@/features/admin/ai-intake/schemas";

const baseImages = [
  { image_url: "https://cdn.example.com/p.jpg", alt_text: null },
];

describe("mass-capture helpers", () => {
  it("treats touch/pen as hold+lock and mouse as tap", () => {
    expect(isHoldLockPointer("touch")).toBe(true);
    expect(isHoldLockPointer("pen")).toBe(true);
    expect(isHoldLockPointer("mouse")).toBe(false);
  });

  it("locks on slide up and cancels on slide left", () => {
    expect(shouldLockFromDelta(-57)).toBe(true);
    expect(shouldLockFromDelta(-10)).toBe(false);
    expect(resolveHoldLockHint(0, -60, false)).toBe("lock");
    expect(resolveHoldLockHint(-60, 0, false)).toBe("cancel");
    expect(resolveHoldLockHint(0, -30, false)).toBe("lock");
    expect(resolveHoldLockHint(0, 0, false)).toBe("none");
    expect(shouldCancelOnRelease(-60, "none")).toBe(true);
    expect(shouldCancelOnRelease(0, "cancel")).toBe(true);
    expect(shouldCancelOnRelease(0, "none")).toBe(false);
  });

  it("gates Finalizar on required preview fields", () => {
    const incomplete = emptyIntakeDraft({
      client_id: "a",
      images: baseImages,
    });
    expect(isIntakeDraftReady(incomplete)).toBe(false);

    const ready = {
      ...incomplete,
      name: "Casaco azul",
      slug: "casaco-azul",
      price: 29.9,
      size_label: "2 anos",
    };
    expect(isIntakeDraftReady(ready)).toBe(true);
    expect(allIntakeDraftsReady([ready])).toBe(true);
    expect(allIntakeDraftsReady([])).toBe(false);
  });
});
