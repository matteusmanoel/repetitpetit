import { afterEach, describe, expect, it, vi } from "vitest";

import { generateAiPreviewDrafts } from "@/features/admin/ai-intake/voice-pipeline";
import {
  aiStructuredItemSchema,
  buildTagsFromAi,
  composeIntakeProductName,
  formatVoiceDomainContext,
  isPriceOnlyEditTranscript,
  isUsefulAudioNote,
  mergeAiDraft,
  mergeEditPatchDraft,
  parseAndValidateLlmItems,
  resolveMergedSizeGroup,
  voiceExtractSystemPrompt,
  voiceSttPrompt,
} from "@/features/admin/ai-intake/ai-config";
import type { Env } from "@/lib/env/load-server";

const baseEnv = {
  OPENAI_API_KEY: "sk-test",
} as Env;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("voice intake merge/defaults (D139/D140)", () => {
  it("treats capture placeholder as not useful transcript text", () => {
    expect(isUsefulAudioNote("[áudio gravado]")).toBe(false);
    expect(isUsefulAudioNote("Vestido Tip Top rosa")).toBe(true);
  });

  it("merges tags from color, attributes, category and LLM suggestions", () => {
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
    ).toEqual(
      expect.arrayContaining(["festa", "rosa", "manga curta", "vestido"]),
    );
  });

  it("infers rn_3m when RN and size_group omitted", () => {
    expect(resolveMergedSizeGroup("RN", null)).toBe("rn_3m");
    expect(resolveMergedSizeGroup("P", null)).toBe("2_3a");
    expect(resolveMergedSizeGroup("RN", "3_6m")).toBe("3_6m");
  });

  it("composes name safely without Title Case on brands", () => {
    expect(
      composeIntakeProductName({
        category_name: "Body",
        brand: "Tip Top",
        color: "rosa",
      }),
    ).toBe("Body Tip Top Rosa");
    expect(
      composeIntakeProductName({
        category_name: "Vestido",
        brand: "GAP",
        color: "azul",
      }),
    ).toBe("Vestido GAP Azul");
    expect(
      composeIntakeProductName({
        category_name: null,
        brand: null,
        color: null,
        fallbackName: "Peça avulsa",
      }),
    ).toBe("Peça avulsa");
  });

  it("keeps price/gender/condition null and composes name from fields", () => {
    const draft = mergeAiDraft(
      {
        client_id: "c1",
        images: [{ image_url: "https://example.com/a.jpg" }],
        audio_note: "[áudio gravado]",
      },
      {
        client_id: "c1",
        name: "ignored when structured fields exist",
        description: "Body rosa RN",
        price: null,
        brand: "Tip Top",
        category_name: "Body",
        color: "rosa",
        attributes: ["manga curta", "Hello Kitty"],
        size_label: "rn",
        size_group: null,
        gender: null,
        condition: null,
        tags: [],
      },
      "Body Tip Top rosa RN",
    );

    expect(draft.price).toBeNull();
    expect(draft.size_label).toBe("RN");
    expect(draft.size_group).toBe("rn_3m");
    expect(draft.gender).toBeNull();
    expect(draft.condition).toBeNull();
    expect(draft.name).toBe("Body Tip Top Rosa");
    expect(draft.category_name).toBe("Body");
    expect(draft.brand).toBe("Tip Top");
    expect(draft.tags).toEqual(
      expect.arrayContaining(["rosa", "manga curta", "hello kitty", "body"]),
    );
    expect(draft.description).toBe("Body rosa RN");
    expect(draft.audio_note).toBe("Body Tip Top rosa RN");
  });

  it("aligns description brand aliases to canonical Tip Top", () => {
    const draft = mergeAiDraft(
      {
        client_id: "c1",
        images: [{ image_url: "https://example.com/a.jpg" }],
        audio_note: null,
      },
      {
        client_id: "c1",
        name: "Body",
        description:
          "Body Tiptop rosa em meia malha, com manga curta e estampa da Hello Kitty.",
        price: 59.9,
        brand: "Tiptop",
        category_name: "Body",
        color: "rosa",
        attributes: ["manga curta", "Hello Kitty", "meia malha"],
        size_label: "RN",
        size_group: "rn_3m",
        gender: null,
        condition: null,
        tags: ["rosa", "body", "hello kitty"],
      },
    );

    expect(draft.brand).toBe("Tip Top");
    expect(draft.name).toBe("Body Tip Top Rosa");
    expect(draft.description).toContain("Tip Top");
    expect(draft.description).not.toMatch(/Tiptop/i);
  });
});

describe("LLM cardinality invariant (D140)", () => {
  it("accepts exact one item per expected client_id", () => {
    const result = parseAndValidateLlmItems(
      [
        {
          client_id: "c1",
          name: "Body",
          brand: "GAP",
          category_name: "Body",
        },
      ],
      ["c1"],
    );
    expect(result.ok).toBe(true);
  });

  it("injects missing client_id when N=1", () => {
    const result = parseAndValidateLlmItems(
      [{ name: "Body", price: "30,00" }],
      ["dialog-1"],
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items[0].client_id).toBe("dialog-1");
      expect(result.items[0].price).toBe(30);
    }
  });

  it("coerces Brazilian price strings", () => {
    const parsed = aiStructuredItemSchema.safeParse({
      client_id: "c1",
      price: "R$ 30,00",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.price).toBe(30);
  });

  it("rejects duplicates and length mismatch", () => {
    const dup = parseAndValidateLlmItems(
      [
        { client_id: "c1", name: "A" },
        { client_id: "c1", name: "A again" },
      ],
      ["c1"],
    );
    expect(dup.ok).toBe(false);

    const mismatch = parseAndValidateLlmItems(
      [
        { client_id: "c1", name: "A" },
        { client_id: "c2", name: "B" },
      ],
      ["c1"],
    );
    expect(mismatch.ok).toBe(false);
  });
});

describe("edit voice patch (D145)", () => {
  it("detects price-only edit transcripts", () => {
    expect(
      isPriceOnlyEditTranscript("muda o preço para trinta reais"),
    ).toBe(true);
    expect(isPriceOnlyEditTranscript("preço R$ 30,00")).toBe(true);
    expect(
      isPriceOnlyEditTranscript("muda o nome para Body e o preço para 30"),
    ).toBe(false);
  });

  it("mergeEditPatchDraft keeps current name when AI invents description-only noise", () => {
    const draft = mergeEditPatchDraft(
      {
        client_id: "dialog-1",
        images: [
          {
            image_url: "https://placehold.co/1.png",
            alt_text: null,
          },
        ],
        audio_note: null,
      },
      {
        client_id: "dialog-1",
        name: "",
        description: null,
        price: 30,
        brand: null,
        category_name: null,
        color: null,
        attributes: [],
        size_label: null,
        size_group: null,
        gender: null,
        condition: null,
        tags: [],
      },
      {
        name: "Body Tip Top Rosa",
        description: "Body rosa Tip Top",
        price: 59.9,
        brand: "Tip Top",
        size_label: "RN",
        size_group: "rn_3m",
        gender: "unissex",
        condition: "seminovo",
        category_name: "Body",
        tags: ["rosa", "body"],
      },
      "muda o preço para 30 reais",
    );

    expect(draft.name).toBe("Body Tip Top Rosa");
    expect(draft.brand).toBe("Tip Top");
    expect(draft.price).toBe(30);
    expect(draft.description).toContain("Tip Top");
  });
});

describe("voice prompts (D139/D140)", () => {
  it("system prompt enforces cardinality and anti-gender inference", () => {
    const prompt = voiceExtractSystemPrompt();
    expect(prompt).toContain("Hello Kitty");
    expect(prompt).toContain("NUNCA inferir");
    expect(prompt).toContain("EXATAMENTE N");
    expect(prompt).toContain("59.9");
    expect(prompt).not.toContain("próxima");
    expect(prompt).toContain("estampa da Hello Kitty");
    expect(prompt).toContain("tags = termos de busca");
  });

  it("STT prompt biases prices and sizes", () => {
    const prompt = voiceSttPrompt();
    expect(prompt).toContain("59,90");
    expect(prompt).toContain("RN");
    expect(prompt).toContain("Tip Top");
  });

  it("formats domain context as match candidates that preserve spoken values", () => {
    const block = formatVoiceDomainContext({
      categoryNames: ["Blusas e Camisetas", "Vestidos e Saias"],
      brandNames: ["GAP", "Tip Top"],
    });
    expect(block).toContain("candidatos para match");
    expect(block).toContain("preservados");
    expect(block).toContain("Blusas e Camisetas");
    expect(block).toContain("Tip Top");
    expect(block).toContain("rn_3m=");
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

  it("uses text note without STT and injects domain context", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      expect(url).toContain("/chat/completions");
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        messages: Array<{ content: unknown }>;
      };
      const userContent = body.messages[1]?.content;
      expect(typeof userContent).toBe("string");
      expect(userContent).toContain("casaco azul GAP");
      expect(userContent).toContain("Categorias existentes: Blusas");
      expect(userContent).toContain("Marcas conhecidas: GAP");
      expect(userContent).toContain("exatamente 1");
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
                      category_name: "Casaco",
                      color: "azul",
                      size_label: "M",
                      size_group: "4_5a",
                      gender: null,
                      condition: null,
                      tags: [],
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
      domainContext: {
        categoryNames: ["Blusas e Camisetas"],
        brandNames: ["GAP"],
      },
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
    expect(result.drafts[0]?.name).toBe("Casaco GAP Azul");
    expect(result.drafts[0]?.price).toBeNull();
    expect(result.drafts[0]?.brand).toBe("GAP");
    expect(result.drafts[0]?.condition).toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries once then falls back when LLM returns duplicate items", async () => {
    const badPayload = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              items: [
                { client_id: "c1", name: "Body", category_name: "Body" },
                { client_id: "c1", name: "Body", category_name: "Body" },
              ],
            }),
          },
        },
      ],
    };

    const fetchImpl = vi.fn(async () => {
      return new Response(JSON.stringify(badPayload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const result = await generateAiPreviewDrafts({
      env: baseEnv,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      input: {
        items: [
          {
            client_id: "c1",
            images: [{ image_url: "https://example.com/a.jpg" }],
            audio_note: "Body Tip Top RN",
          },
        ],
      },
    });

    expect(result.mode).toBe("manual");
    expect(result.warning).toMatch(/inconsistentes/i);
    expect(result.drafts[0]?.name).toBe("");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("runs STT with vocabulary prompt then LLM", async () => {
    const tinyWebm =
      "data:audio/webm;base64," + Buffer.from("fake-audio").toString("base64");

    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/audio/transcriptions")) {
        const body = init?.body as FormData;
        expect(body.get("prompt")).toEqual(expect.stringContaining("59,90"));
        expect(body.get("language")).toBe("pt");
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
                      category_name: "Vestido",
                      color: "rosa",
                      size_label: "P",
                      size_group: "2_3a",
                      gender: null,
                      condition: null,
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
    expect(result.drafts[0]?.name).toBe("Vestido Tip Top Rosa");
    expect(result.drafts[0]?.tags).toContain("rosa");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("runs STT for MediaRecorder data URLs with codec params", async () => {
    const tinyWebm =
      "data:audio/webm;codecs=opus;base64," +
      Buffer.from("fake-audio").toString("base64");

    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/audio/transcriptions")) {
        return new Response(JSON.stringify({ text: "Body GAP rosa vinte reais" }), {
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
                      name: "Body GAP",
                      description: "Body GAP rosa",
                      price: 20,
                      brand: "GAP",
                      category_name: "Body",
                      color: "rosa",
                      size_label: "P",
                      size_group: "rn_3m",
                      gender: null,
                      condition: null,
                      tags: ["rosa"],
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
    expect(result.debug?.transcripts[0]?.transcript).toMatch(/Body GAP/i);
    expect(result.drafts[0]?.name).toBe("Body GAP Rosa");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
