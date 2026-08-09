import { describe, expect, it } from "vitest";

import {
  allIntakeDraftsReady,
  cameraErrorMessagePt,
  classifyCameraError,
  generatePreviewCtaLabel,
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

  it("classifies camera failures with actionable PT messages", () => {
    expect(classifyCameraError(null, false)).toBe("insecure_context");
    expect(classifyCameraError(null, true, false)).toBe("insecure_context");
    expect(
      classifyCameraError({ name: "NotAllowedError" }, true),
    ).toBe("permission_denied");
    expect(classifyCameraError({ name: "NotFoundError" }, true)).toBe(
      "not_found",
    );
    expect(classifyCameraError({ name: "NotReadableError" }, true)).toBe(
      "unavailable",
    );

    expect(cameraErrorMessagePt("insecure_context")).toMatch(/HTTPS/);
    expect(cameraErrorMessagePt("permission_denied")).toMatch(/Permissão/);
    expect(cameraErrorMessagePt("not_found")).toMatch(/Nenhuma câmera/);
    expect(cameraErrorMessagePt("unavailable")).toMatch(/upload/);
  });

  it("labels Gerar preview CTA with piece count and AI mode", () => {
    expect(
      generatePreviewCtaLabel({ aiConfigured: true, capturedCount: 0 }),
    ).toBe("Gerar preview com IA");
    expect(
      generatePreviewCtaLabel({ aiConfigured: true, capturedCount: 1 }),
    ).toBe("Gerar preview com IA (1 peça)");
    expect(
      generatePreviewCtaLabel({ aiConfigured: true, capturedCount: 3 }),
    ).toBe("Gerar preview com IA (3 peças)");
    expect(
      generatePreviewCtaLabel({ aiConfigured: false, capturedCount: 2 }),
    ).toBe("Abrir preview (2 peças)");
  });

  it("gates Finalizar on photo presence (D135 soft finalize)", () => {
    const incomplete = emptyIntakeDraft({
      client_id: "a",
      images: baseImages,
    });
    expect(isIntakeDraftReady(incomplete)).toBe(false);
    expect(allIntakeDraftsReady([incomplete])).toBe(true);

    const ready = {
      ...incomplete,
      name: "Casaco azul",
      slug: "casaco-azul",
      price: 29.9,
      size_label: "M",
    };
    expect(isIntakeDraftReady(ready)).toBe(true);
    expect(allIntakeDraftsReady([ready])).toBe(true);
    expect(allIntakeDraftsReady([])).toBe(false);
  });
});
