import { afterEach, describe, expect, it, vi } from "vitest";

import { generateAiPreviewDrafts } from "@/features/admin/ai-intake/voice-pipeline";
import {
  buildTagsFromAi,
  isUsefulAudioNote,
  mergeAiDraft,
} from "@/features/admin/ai-intake/ai-config";
import type { Env } from "@/lib/env/load-server";

const baseEnv = {
  OPENAI_API_KEY: "sk-test",
} as Env;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("voice intake merge/defaults (D135)", () => {
  it("treats capture placeholder as not useful transcript text", () => {
    expect(isUsefulAudioNote("[áudio gravado]")).toBe(false);
    expect(isUsefulAudioNote("Vestido Tip Top rosa")).toBe(true);
  });

  it("merges tags from color and attributes", () => {
    expect(
      buildTagsFromAi({
        client_id: "c1",
        name: "Vestido",
        description: null,
        price: null,
        brand: "Tip Top",
        category_name: "vestido",
        color: "Rosa",
        attributes: ["manga curta"],
        size_label: "P",
        size_group: "2_3a",
        gender: "menina",
        condition: "seminovo",
        tags: ["festa"],
      }),
    ).toEqual(expect.arrayContaining(["festa", "rosa", "manga curta"]));
  });

  it("keeps price null when AI omits price and coerces size RN", () => {
    const draft = mergeAiDraft(
      {
        client_id: "c1",
        images: [{ image_url: "https://example.com/a.jpg" }],
        audio_note: "[áudio gravado]",
      },
      {
        client_id: "c1",
        name: "Body Tip Top",
        description: "Body rosa RN",
        price: null,
        brand: "Tip Top",
        category_name: "body",
        color: "rosa",
        attributes: [],
        size_label: "rn",
        size_group: "rn_3m",
        gender: "unissex",
        condition: "seminovo",
        tags: [],
      },
      "Body Tip Top rosa RN",
    );

    expect(draft.price).toBeNull();
    expect(draft.size_label).toBe("RN");
    expect(draft.category_name).toBe("body");
    expect(draft.description).toBe("Body rosa RN");
    expect(draft.audio_note).toBe("Body Tip Top rosa RN");
  });
});

describe("generateAiPreviewDrafts voice pipeline", () => {
  it("falls back to manual without API key", async () => {
    const result = await generateAiPreviewDrafts({
      env: {} as Env,
      input: {
        items: [
          {
            client_id: "c1",
            images: [{ image_url: "https://example.com/a.jpg" }],
            audio_note: "casaco azul",
          },
        ],
      },
    });
    expect(result.mode).toBe("manual");
    expect(result.drafts[0]?.name).toBe("");
  });

  it("uses text note without STT and does not send images to chat", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      expect(url).toContain("/chat/completions");
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        messages: Array<{ content: unknown }>;
      };
      const userContent = body.messages[1]?.content;
      expect(typeof userContent).toBe("string");
      expect(userContent).toContain("casaco azul GAP");
      expect(JSON.stringify(body)).not.toContain("image_url");

      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  items: [
                    {
                      client_id: "c1",
                      name: "Casaco GAP",
                      description: "Casaco azul GAP",
                      price: null,
                      brand: "GAP",
                      category_name: "casaco",
                      size_label: "M",
                      size_group: "4_5a",
                      gender: "unissex",
                      condition: "seminovo",
                      tags: ["azul"],
                    },
                  ],
                }),
              },
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 20 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    const result = await generateAiPreviewDrafts({
      env: baseEnv,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      input: {
        items: [
          {
            client_id: "c1",
            images: [{ image_url: "https://example.com/photo.jpg" }],
            audio_note: "casaco azul GAP tamanho M quatro anos",
          },
        ],
      },
    });

    expect(result.mode).toBe("ai");
    expect(result.drafts[0]?.name).toBe("Casaco GAP");
    expect(result.drafts[0]?.price).toBeNull();
    expect(result.drafts[0]?.brand).toBe("GAP");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("runs STT for data URL audio then LLM", async () => {
    const tinyWebm =
      "data:audio/webm;base64," + Buffer.from("fake-audio").toString("base64");

    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/audio/transcriptions")) {
        return new Response(JSON.stringify({ text: "Vestido Tip Top rosa trinta reais" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  items: [
                    {
                      client_id: "c1",
                      name: "Vestido Tip Top",
                      description: "Vestido Tip Top rosa",
                      price: 30,
                      brand: "Tip Top",
                      category_name: "vestido",
                      color: "rosa",
                      size_label: "P",
                      size_group: "2_3a",
                      gender: "menina",
                      condition: "seminovo",
                      tags: [],
                    },
                  ],
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    const result = await generateAiPreviewDrafts({
      env: baseEnv,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      input: {
        items: [
          {
            client_id: "c1",
            images: [{ image_url: "https://example.com/v.jpg" }],
            audio_data_url: tinyWebm,
            audio_note: "[áudio gravado]",
          },
        ],
      },
    });

    expect(result.mode).toBe("ai");
    expect(result.drafts[0]?.price).toBe(30);
    expect(result.drafts[0]?.tags).toContain("rosa");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain("/audio/transcriptions");
  });
});
