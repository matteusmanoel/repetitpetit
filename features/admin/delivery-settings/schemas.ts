import { z } from "zod";

const cepSchema = z
  .string({ error: "Informe o CEP da loja." })
  .trim()
  .transform((value) => value.replace(/\D/g, ""))
  .refine((digits) => /^\d{8}$/.test(digits), "CEP deve ter 8 dígitos.");

const moneySchema = (label: string) =>
  z.coerce
    .number({ error: `Informe ${label}.` })
    .finite(`Informe ${label} válido.`)
    .min(0, `${label} não pode ser negativo.`);

const positiveSchema = (label: string) =>
  z.coerce
    .number({ error: `Informe ${label}.` })
    .finite(`Informe ${label} válido.`)
    .gt(0, `${label} deve ser maior que zero.`);

export const deliverySettingsSchema = z.object({
  storePostalCode: cepSchema,
  deliveryEnabled: z.boolean(),
  ratePerKm: moneySchema("a taxa por km"),
  multiplier: positiveSchema("o multiplicador"),
  minAmount: moneySchema("o frete mínimo"),
  maxRadiusKm: positiveSchema("o raio máximo"),
});

export type DeliverySettingsInput = z.infer<typeof deliverySettingsSchema>;

export function parseDeliverySettingsFormData(formData: FormData) {
  const enabledRaw = formData.get("deliveryEnabled");
  return deliverySettingsSchema.safeParse({
    storePostalCode: formData.get("storePostalCode"),
    deliveryEnabled: enabledRaw === "true" || enabledRaw === "on",
    ratePerKm: formData.get("ratePerKm"),
    multiplier: formData.get("multiplier"),
    minAmount: formData.get("minAmount"),
    maxRadiusKm: formData.get("maxRadiusKm"),
  });
}
