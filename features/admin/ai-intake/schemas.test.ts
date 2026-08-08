import { describe, expect, it } from "vitest";

import {
  confirmIntakeBatchSchema,
  emptyIntakeDraft,
  generatePreviewInputSchema,
  intakePreviewItemSchema,
} from "@/features/admin/ai-intake/schemas";
import {
  buildManualPreviewDrafts,
  isAiIntakeConfigured,
  resolveAiApiKey,
} from "@/features/admin/ai-intake/ai-config";

describe("ai-intake schemas", () => {
  it("builds an empty editable draft with photos", () => {
    const draft = emptyIntakeDraft({
      client_id: "c1",
      images: [{ image_url: "https://example.com/a.jpg" }],
      audio_note: "casaco azul",
    });

    expect(draft.client_id).toBe("c1");
    expect(draft.name).toBe("");
    expect(draft.images).toHaveLength(1);
    expect(draft.description).toBe("casaco azul");
  });

  it("validates generate preview input", () => {
    const parsed = generatePreviewInputSchema.safeParse({
      items: [
        {
          client_id: "a",
          images: [{ image_url: "https://example.com/x.jpg" }],
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects confirm without required product fields", () => {
    const parsed = intakePreviewItemSchema.safeParse(
      emptyIntakeDraft({
        client_id: "c1",
        images: [{ image_url: "https://example.com/a.jpg" }],
      }),
    );
    expect(parsed.success).toBe(false);
  });

  it("accepts a filled confirm payload", () => {
    const parsed = confirmIntakeBatchSchema.safeParse({
      items: [
        {
          client_id: "c1",
          name: "Casaco azul GAP",
          slug: "casaco-azul-gap",
          description: null,
          price: 49.9,
          compare_at_price: null,
          brand: "GAP",
          size_label: "2 anos",
          size_group: "2_3a",
          gender: "unissex",
          condition: "seminovo",
          tags: ["inverno"],
          category_id: null,
          images: [{ image_url: "https://example.com/a.jpg" }],
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });
});

describe("ai-intake provider gates", () => {
  it("reports missing AI key", () => {
    expect(
      isAiIntakeConfigured({
        OPENAI_API_KEY: undefined,
        AI_GATEWAY_API_KEY: undefined,
      }),
    ).toBe(false);
    expect(
      resolveAiApiKey({
        OPENAI_API_KEY: undefined,
        AI_GATEWAY_API_KEY: undefined,
      }),
    ).toBeNull();
  });

  it("prefers OPENAI_API_KEY over gateway", () => {
    const resolved = resolveAiApiKey({
      OPENAI_API_KEY: "sk-test",
      AI_GATEWAY_API_KEY: "gw-test",
    });
    expect(resolved).toEqual({ key: "sk-test", source: "openai" });
  });

  it("manual drafts preserve photos", () => {
    const drafts = buildManualPreviewDrafts({
      items: [
        {
          client_id: "x",
          images: [{ image_url: "https://example.com/p.jpg" }],
          audio_note: "nota",
        },
      ],
    });
    expect(drafts).toHaveLength(1);
    expect(drafts[0].images[0].image_url).toBe("https://example.com/p.jpg");
    expect(drafts[0].name).toBe("");
  });
});
