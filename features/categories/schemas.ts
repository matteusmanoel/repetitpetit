import { z } from "zod";

import { slugify } from "@/lib/slug";

function emptyToNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * Schema do formulário de categoria (create/update).
 * `image_url` é opcional — a home só exige categorias ativas com nome/slug.
 */
export const categoryFormSchema = z.object({
  name: z
    .string({ error: "Informe o nome da categoria." })
    .trim()
    .min(1, "Informe o nome da categoria.")
    .max(120, "O nome deve ter no máximo 120 caracteres."),
  slug: z
    .string({ error: "Informe o slug." })
    .trim()
    .min(1, "Informe o slug.")
    .max(120, "O slug deve ter no máximo 120 caracteres.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use apenas letras minúsculas, números e hífens.")
    .transform((value) => slugify(value)),
  description: z.preprocess(emptyToNull, z.string().max(500).nullable()),
  image_url: z.preprocess(
    emptyToNull,
    z.string().url("URL da imagem inválida.").nullable(),
  ),
  is_active: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .transform((value) => (typeof value === "boolean" ? value : value === "true")),
  sort_order: z.coerce
    .number({ error: "Informe a ordem de exibição." })
    .int("A ordem deve ser um número inteiro.")
    .min(0, "A ordem não pode ser negativa.")
    .max(9999, "A ordem deve ser no máximo 9999."),
});

export type CategoryFormInput = z.infer<typeof categoryFormSchema>;

export function parseCategoryFormData(formData: FormData) {
  return categoryFormSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") ?? "",
    image_url: formData.get("image_url") ?? "",
    is_active: formData.get("is_active") ?? "true",
    sort_order: formData.get("sort_order") ?? "0",
  });
}
