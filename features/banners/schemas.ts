import { z } from "zod";

function emptyToNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * Schema do formulário de banner (create/update).
 * `image_url` é obrigatório no schema do banco (docs/04-data-model.md).
 */
export const bannerFormSchema = z.object({
  title: z.preprocess(emptyToNull, z.string().max(160).nullable()),
  subtitle: z.preprocess(emptyToNull, z.string().max(240).nullable()),
  image_url: z
    .string({ error: "Envie a imagem do banner." })
    .trim()
    .min(1, "Envie a imagem do banner.")
    .url("URL da imagem inválida."),
  cta_label: z.preprocess(emptyToNull, z.string().max(80).nullable()),
  cta_href: z.preprocess(
    emptyToNull,
    z
      .string()
      .max(500)
      .regex(/^(\/|https?:\/\/)/, "O link do botão deve começar com / ou http(s)://.")
      .nullable(),
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

export type BannerFormInput = z.infer<typeof bannerFormSchema>;

export function parseBannerFormData(formData: FormData) {
  return bannerFormSchema.safeParse({
    title: formData.get("title") ?? "",
    subtitle: formData.get("subtitle") ?? "",
    image_url: formData.get("image_url") ?? "",
    cta_label: formData.get("cta_label") ?? "",
    cta_href: formData.get("cta_href") ?? "",
    is_active: formData.get("is_active") ?? "true",
    sort_order: formData.get("sort_order") ?? "0",
  });
}
