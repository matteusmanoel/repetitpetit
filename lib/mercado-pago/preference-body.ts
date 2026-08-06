export type PreferenceItemInput = {
  id: string;
  title: string;
  quantity: number;
  unitPrice: number;
  pictureUrl?: string | null;
  description?: string | null;
};

export type CreatePreferenceInput = {
  /** Código público do pedido (ex.: RP-2026-0042) — vira external_reference. */
  externalReference: string;
  items: PreferenceItemInput[];
  /** Frete em BRL; se > 0, vira item separado "Frete". */
  shippingAmount?: number;
  payer?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  /** Path absoluto no site, ex.: /checkout/sucesso?codigo=RP-2026-0042 */
  backPath: string;
  metadata?: Record<string, string>;
};

export type PreferenceRequestBody = {
  items: Array<{
    id: string;
    title: string;
    quantity: number;
    unit_price: number;
    currency_id: "BRL";
    picture_url?: string;
    description?: string;
    category_id?: string;
  }>;
  payer?: {
    name?: string;
    email?: string;
    phone?: { number: string };
  };
  back_urls: {
    success: string;
    pending: string;
    failure: string;
  };
  auto_return: "approved";
  external_reference: string;
  notification_url?: string;
  statement_descriptor?: string;
  metadata?: Record<string, string>;
  /**
   * Cartão + PIX; boleto/ticket excluído (D98).
   * PIX = payment type `bank_transfer` / method `pix` — não excluir.
   */
  payment_methods?: {
    installments?: number;
    excluded_payment_types?: Array<{ id: string }>;
  };
};

/**
 * Monta o body da Preference API (puro — testável sem rede).
 * Sem gift_message (reuse-map flor). PIX + cartão; boleto excluído (D98).
 */
export function buildPreferenceBody(
  input: CreatePreferenceInput,
  siteUrl: string,
  storeName: string,
): PreferenceRequestBody {
  const items: PreferenceRequestBody["items"] = input.items.map((item) => {
    const row: PreferenceRequestBody["items"][number] = {
      id: item.id,
      title: truncate(item.title, 256),
      quantity: item.quantity,
      unit_price: roundMoney(item.unitPrice),
      currency_id: "BRL",
      category_id: "fashion",
    };

    if (item.description) {
      row.description = truncate(item.description, 256);
    }

    const picture = httpsOnly(item.pictureUrl);
    if (picture) {
      row.picture_url = picture;
    }

    return row;
  });

  const shipping = roundMoney(input.shippingAmount ?? 0);
  if (shipping > 0) {
    items.push({
      id: "shipping",
      title: "Frete",
      quantity: 1,
      unit_price: shipping,
      currency_id: "BRL",
      category_id: "services",
    });
  }

  if (items.length === 0) {
    throw new Error("Preferência Mercado Pago exige ao menos um item.");
  }

  const backUrl = absoluteHttpsUrl(siteUrl, input.backPath);
  const notificationUrl = absoluteHttpsUrl(
    siteUrl,
    "/api/webhooks/mercadopago",
  );

  const body: PreferenceRequestBody = {
    items,
    back_urls: {
      success: backUrl,
      pending: backUrl,
      failure: backUrl,
    },
    auto_return: "approved",
    external_reference: sanitizeExternalReference(input.externalReference),
    notification_url: notificationUrl,
    statement_descriptor: truncate(
      storeName.replace(/[^a-zA-Z0-9 ]/g, "").trim() || "REPETI PETIT",
      22,
    ),
    payment_methods: {
      // Cartão com parcelas; PIX (bank_transfer) permanece; boleto = ticket.
      installments: 12,
      excluded_payment_types: [{ id: "ticket" }],
    },
  };

  if (input.metadata) {
    body.metadata = input.metadata;
  }

  const payer = buildPayer(input.payer);
  if (payer) {
    body.payer = payer;
  }

  return body;
}

function buildPayer(
  payer: CreatePreferenceInput["payer"],
): PreferenceRequestBody["payer"] | undefined {
  if (!payer) return undefined;

  const result: NonNullable<PreferenceRequestBody["payer"]> = {};

  if (payer.name?.trim()) {
    result.name = truncate(payer.name.trim(), 150);
  }

  if (payer.email?.trim()) {
    result.email = payer.email.trim();
  }

  const phoneDigits = payer.phone?.replace(/\D/g, "") ?? "";
  if (phoneDigits.length >= 10) {
    result.phone = { number: phoneDigits };
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function absoluteHttpsUrl(siteUrl: string, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl.replace(/\/$/, "")}${normalizedPath}`;
}

function httpsOnly(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

function sanitizeExternalReference(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  if (!cleaned) {
    throw new Error("external_reference inválido para Mercado Pago.");
  }
  return cleaned;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : value.slice(0, max);
}
