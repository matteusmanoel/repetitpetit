import { z } from "zod";

const phoneSchema = z
  .string({ error: "Informe seu telefone." })
  .trim()
  .transform((value) => value.replace(/\D/g, ""))
  .refine(
    (digits) => /^\d{10,15}$/.test(digits),
    "Informe o telefone com DDD, só números (ex.: 45999999999).",
  );

/** Required at checkout (SN-12 / D69). Normalized like lead emails. */
const emailSchema = z
  .string({ error: "Informe seu e-mail." })
  .trim()
  .toLowerCase()
  .min(1, "Informe seu e-mail.")
  .email("Informe um e-mail válido.")
  .max(254, "E-mail muito longo.");

export const checkoutAddressSchema = z.object({
  recipientName: z
    .string({ error: "Informe o nome do destinatário." })
    .trim()
    .min(2, "Informe o nome do destinatário.")
    .max(120, "Nome muito longo."),
  street: z
    .string({ error: "Informe a rua." })
    .trim()
    .min(2, "Informe a rua.")
    .max(200, "Rua muito longa."),
  number: z
    .string({ error: "Informe o número." })
    .trim()
    .min(1, "Informe o número.")
    .max(20, "Número muito longo."),
  complement: z
    .string()
    .trim()
    .max(120, "Complemento muito longo.")
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  neighborhood: z
    .string({ error: "Informe o bairro." })
    .trim()
    .min(2, "Informe o bairro.")
    .max(120, "Bairro muito longo."),
  city: z
    .string({ error: "Informe a cidade." })
    .trim()
    .min(2, "Informe a cidade.")
    .max(120, "Cidade muito longa."),
  state: z
    .string({ error: "Informe o estado." })
    .trim()
    .length(2, "UF deve ter 2 letras.")
    .transform((value) => value.toUpperCase()),
  postalCode: z
    .string({ error: "Informe o CEP." })
    .trim()
    .transform((value) => value.replace(/\D/g, ""))
    .refine((digits) => /^\d{8}$/.test(digits), "CEP deve ter 8 dígitos."),
  reference: z
    .string()
    .trim()
    .max(200, "Referência muito longa.")
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
});

/**
 * Payload do checkout (T15). Sem gift_message / Stripe.
 * Preços e frete são recalculados no server — o client só envia IDs.
 */
export const createOrderSchema = z
  .object({
    fullName: z
      .string({ error: "Informe seu nome." })
      .trim()
      .min(2, "Informe seu nome completo.")
      .max(120, "Nome muito longo."),
    phone: phoneSchema,
    email: emailSchema,
    fulfillmentType: z.enum(["pickup", "delivery"], {
      error: "Escolha retirada ou entrega.",
    }),
    address: checkoutAddressSchema.optional(),
    productIds: z
      .array(z.uuid("productId inválido."))
      .min(1, "Seu carrinho está vazio."),
  })
  .superRefine((data, ctx) => {
    if (data.fulfillmentType === "delivery" && !data.address) {
      ctx.addIssue({
        code: "custom",
        path: ["address"],
        message: "Preencha o endereço de entrega.",
      });
    }
  });

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CheckoutAddressParsed = z.infer<typeof checkoutAddressSchema>;
