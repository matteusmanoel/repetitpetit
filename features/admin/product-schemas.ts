import { z } from "zod";

import {
  PRODUCT_CONDITIONS,
  PRODUCT_GENDERS,
  PRODUCT_SIZE_LABELS,
  PRODUCT_STATUSES,
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

const optionalPrice = z.preprocess(emptyToNull, z.coerce.number().positive().nullable());

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

const booleanFromForm = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "on" || value === "1") return true;
  return false;
}, z.boolean());

export const productImageInputSchema = z.object({
  image_url: z.string().url("URL de imagem inválida."),
  alt_text: z.preprocess(emptyToNull, z.string().max(200).nullable()).optional(),
});

export type ProductImageInput = z.infer<typeof productImageInputSchema>;

/**
 * Schema do formulário de produto (create/edit). Cobre todos os campos
 * listados na AC da T10 / docs/04-data-model.md `products`, mais
 * `category_id` (FK opcional) e a lista de imagens persistida em
 * `product_images`.
 */
export const productFormSchema = z.object({
  name: z
    .string({ error: "Informe o nome da peça." })
    .trim()
    .min(2, "O nome precisa ter pelo menos 2 caracteres.")
    .max(160, "O nome pode ter no máximo 160 caracteres."),
  slug: z.preprocess((value) => {
    if (typeof value === "string" && value.trim() !== "") {
      return slugifyProductName(value);
    }
    return value;
  }, z
    .string({ error: "Informe o slug." })
    .min(2, "O slug precisa ter pelo menos 2 caracteres.")
    .max(120, "O slug pode ter no máximo 120 caracteres.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use apenas letras minúsculas, números e hífens.")),
  description: z.preprocess(emptyToNull, z.string().max(5000).nullable()),
  price: z.coerce
    .number({ error: "Informe o preço." })
    .positive("O preço deve ser maior que zero."),
  compare_at_price: optionalPrice,
  brand: z.preprocess(emptyToNull, z.string().max(80).nullable()),
  size_label: z.enum(PRODUCT_SIZE_LABELS, {
    error: "Selecione o tamanho (P, M ou G).",
  }),
  size_group: z.enum(SIZE_GROUPS, { error: "Selecione o grupo de tamanho." }),
  gender: z.enum(PRODUCT_GENDERS, { error: "Selecione o gênero." }),
  condition: z.enum(PRODUCT_CONDITIONS, { error: "Selecione a condição." }),
  status: z.enum(PRODUCT_STATUSES, { error: "Selecione o status." }),
  quantity: z.coerce
    .number({ error: "Informe a quantidade." })
    .int("A quantidade deve ser um número inteiro.")
    .min(0, "A quantidade não pode ser negativa.")
    .default(1),
  is_featured: booleanFromForm,
  tags: tagsSchema,
  category_id: optionalUuid,
  images: z.array(productImageInputSchema).default([]),
});

export type ProductFormInput = z.infer<typeof productFormSchema>;

export type ProductActionState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof ProductFormInput, string[]>>;
};

export const initialProductActionState: ProductActionState = {};

/**
 * Extrai e valida o payload do FormData do formulário de produto.
 * Campos complexos (`images`) chegam como JSON string em um input hidden.
 */
export function parseProductFormData(formData: FormData):
  | { success: true; data: ProductFormInput }
  | { success: false; state: ProductActionState } {
  let images: unknown = [];

  const rawImages = formData.get("images");
  if (typeof rawImages === "string" && rawImages.trim() !== "") {
    try {
      images = JSON.parse(rawImages);
    } catch {
      return {
        success: false,
        state: { error: "Lista de imagens inválida. Tente enviar novamente." },
      };
    }
  }

  const parsed = productFormSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    price: formData.get("price"),
    compare_at_price: formData.get("compare_at_price"),
    brand: formData.get("brand"),
    size_label: formData.get("size_label"),
    size_group: formData.get("size_group"),
    gender: formData.get("gender"),
    condition: formData.get("condition"),
    status: formData.get("status"),
    quantity: formData.get("quantity") || "1",
    is_featured: formData.get("is_featured"),
    tags: formData.get("tags"),
    category_id: formData.get("category_id"),
    images,
  });

  if (!parsed.success) {
    const fieldErrors: ProductActionState["fieldErrors"] = {};

    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key !== "string") continue;
      const field = key as keyof ProductFormInput;
      fieldErrors[field] = [...(fieldErrors[field] ?? []), issue.message];
    }

    return {
      success: false,
      state: {
        error: "Revise os campos destacados e tente novamente.",
        fieldErrors,
      },
    };
  }

  return { success: true, data: parsed.data };
}
