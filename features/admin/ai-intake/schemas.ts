import { z } from "zod";

import {
  PRODUCT_CONDITIONS,
  PRODUCT_GENDERS,
  PRODUCT_SIZE_LABELS,
  SIZE_GROUPS,
  slugifyProductName,
} from "@/features/admin/product-constants";

const emptyToNull = (value: unknown) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
};

const optionalUuid = z.preprocess(
  emptyToNull,
  z.string().uuid("Categoria inválida.").nullable(),
);

const tagsSchema = z.preprocess((value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}, z.array(z.string().min(1)).default([]));

export const intakeImageSchema = z.object({
  image_url: z.string().url("URL de imagem inválida."),
  alt_text: z.preprocess(emptyToNull, z.string().max(200).nullable()).optional(),
});

/**
 * Zod draft for one garment in the AI intake editable preview (SO-04 / D107).
 * Mirrors product form fields staff must confirm before insert.
 */
export const intakePreviewItemSchema = z.object({
  client_id: z.string().min(1),
  name: z
    .string()
    .trim()
    .min(2, "O nome precisa ter pelo menos 2 caracteres.")
    .max(160),
  slug: z.preprocess((value) => {
    if (typeof value === "string" && value.trim() !== "") {
      return slugifyProductName(value);
    }
    return value;
  }, z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug inválido.")),
  description: z.preprocess(emptyToNull, z.string().max(5000).nullable()),
  price: z.coerce.number().positive("O preço deve ser maior que zero."),
  compare_at_price: z.preprocess(
    emptyToNull,
    z.coerce.number().positive().nullable(),
  ),
  brand: z.preprocess(emptyToNull, z.string().max(80).nullable()),
  size_label: z.enum(PRODUCT_SIZE_LABELS, {
    error: "Selecione o tamanho (RN, P, M ou G).",
  }),
  size_group: z.enum(SIZE_GROUPS),
  gender: z.enum(PRODUCT_GENDERS),
  condition: z.enum(PRODUCT_CONDITIONS),
  tags: tagsSchema,
  category_id: optionalUuid,
  images: z.array(intakeImageSchema).min(1, "Envie pelo menos uma foto."),
  audio_note: z.preprocess(emptyToNull, z.string().max(8000).nullable()).optional(),
});

export type IntakePreviewItem = z.infer<typeof intakePreviewItemSchema>;

/** Loose draft from AI / empty manual fill — may fail full validation until staff edits. */
export const intakeDraftItemSchema = z.object({
  client_id: z.string().min(1),
  name: z.string().default(""),
  slug: z.string().default(""),
  description: z.string().nullable().default(null),
  price: z.union([z.number(), z.string(), z.null()]).default(null),
  compare_at_price: z.union([z.number(), z.string(), z.null()]).default(null),
  brand: z.string().nullable().default(null),
  size_label: z.string().default(""),
  size_group: z.enum(SIZE_GROUPS).default("2_3a"),
  gender: z.enum(PRODUCT_GENDERS).default("unissex"),
  condition: z.enum(PRODUCT_CONDITIONS).default("seminovo"),
  tags: z.array(z.string()).default([]),
  category_id: z.string().nullable().default(null),
  /** Suggested category label from voice LLM — matched/created on Finalizar (D135). */
  category_name: z.string().nullable().optional().default(null),
  images: z.array(intakeImageSchema).default([]),
  audio_note: z.string().nullable().optional(),
});

export type IntakeDraftItem = z.infer<typeof intakeDraftItemSchema>;

/** Soft finalize (D135): incomplete OK → inactive; publish gated separately. */
export const intakeFinalizeItemSchema = z.object({
  client_id: z.string().min(1),
  name: z.string().trim().max(160).default(""),
  slug: z.string().default(""),
  description: z.preprocess(emptyToNull, z.string().max(5000).nullable()).optional(),
  price: z.preprocess((value) => {
    if (value === null || value === undefined || value === "") return 0;
    if (typeof value === "string") {
      const n = Number(value.replace(",", "."));
      return Number.isFinite(n) ? n : 0;
    }
    return value;
  }, z.number().min(0)),
  compare_at_price: z.preprocess(
    emptyToNull,
    z.coerce.number().positive().nullable(),
  ).optional(),
  brand: z.preprocess(emptyToNull, z.string().max(80).nullable()).optional(),
  size_label: z.string().default(""),
  size_group: z.enum(SIZE_GROUPS).default("2_3a"),
  gender: z.enum(PRODUCT_GENDERS).default("unissex"),
  condition: z.enum(PRODUCT_CONDITIONS).default("seminovo"),
  tags: tagsSchema,
  category_id: optionalUuid,
  category_name: z.preprocess(emptyToNull, z.string().max(120).nullable()).optional(),
  images: z.array(intakeImageSchema).min(1, "Envie pelo menos uma foto."),
  audio_note: z.preprocess(emptyToNull, z.string().max(8000).nullable()).optional(),
  /** When true and publish gate passes, insert as available; else inactive. */
  publish: z.boolean().default(false),
});

export type IntakeFinalizeItem = z.infer<typeof intakeFinalizeItemSchema>;

export const generatePreviewInputSchema = z.object({
  items: z
    .array(
      z.object({
        client_id: z.string().min(1),
        images: z.array(intakeImageSchema).min(1),
        /** Audio capture as data URL for STT (D135). Images are not sent to the LLM. */
        audio_data_url: z.string().max(15_000_000).nullable().optional(),
        audio_note: z.string().max(8000).nullable().optional(),
      }),
    )
    .min(1, "Adicione ao menos uma peça.")
    .max(30),
});

export type GeneratePreviewInput = z.infer<typeof generatePreviewInputSchema>;

export const confirmIntakeBatchSchema = z.object({
  items: z.array(intakeFinalizeItemSchema).min(1).max(30),
});

export type ConfirmIntakeBatchInput = z.infer<typeof confirmIntakeBatchSchema>;

export function emptyIntakeDraft(params: {
  client_id: string;
  images: z.infer<typeof intakeImageSchema>[];
  audio_note?: string | null;
}): IntakeDraftItem {
  return intakeDraftItemSchema.parse({
    client_id: params.client_id,
    name: "",
    slug: "",
    description: params.audio_note?.trim() || null,
    price: null,
    compare_at_price: null,
    brand: null,
    size_label: "",
    size_group: "2_3a",
    gender: "unissex",
    condition: "seminovo",
    tags: [],
    category_id: null,
    category_name: null,
    images: params.images,
    audio_note: params.audio_note ?? null,
  });
}
