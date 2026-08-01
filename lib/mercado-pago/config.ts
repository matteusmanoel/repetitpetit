import "server-only";

import { env } from "@/lib/env";

export const MERCADOPAGO_API_BASE = "https://api.mercadopago.com";

export type MercadoPagoConfig = {
  accessToken: string;
  publicKey: string | undefined;
  siteUrl: string;
  storeName: string;
  /** Preferências de teste usam `sandbox_init_point`. */
  isSandbox: boolean;
};

/**
 * Valida e retorna credenciais Mercado Pago no momento do uso (D16).
 * Scaffold/build sem `MERCADOPAGO_*` continua válido; checkout falha alto aqui.
 */
export function getMercadoPagoConfig(): MercadoPagoConfig {
  const accessToken = env.MERCADOPAGO_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error(
      "MERCADOPAGO_ACCESS_TOKEN não configurado. Defina no .env.local " +
        "(veja .env.example) para criar preferências Checkout Pro.",
    );
  }

  const siteUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

  if (!siteUrl.startsWith("https://")) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL deve usar HTTPS para back_urls/notification_url do Mercado Pago.",
    );
  }

  return {
    accessToken,
    publicKey: env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY,
    siteUrl,
    storeName: env.NEXT_PUBLIC_STORE_NAME,
    isSandbox: accessToken.startsWith("TEST-"),
  };
}
