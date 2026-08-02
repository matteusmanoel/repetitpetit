import { randomUUID } from "node:crypto";

import { cookies } from "next/headers";

import { CART_SESSION_COOKIE } from "@/features/cart/constants";
import { env } from "@/lib/env";

/**
 * Lê o cookie anônimo de carrinho, sem criar um novo.
 * Usado em leituras (ex.: indicador de reserva na PDP) para não emitir cookie
 * só por visitar a página.
 */
export async function peekCartSessionId(): Promise<string | null> {
  const jar = await cookies();
  const existing = jar.get(CART_SESSION_COOKIE)?.value?.trim();

  if (existing && existing.length >= 8) {
    return existing;
  }

  return null;
}

/**
 * Lê o cookie anônimo de carrinho ou gera um novo UUID.
 * Quem chama (route handlers) deve gravar o cookie na response quando `isNew`.
 */
export async function getCartSessionId(): Promise<{ sessionId: string; isNew: boolean }> {
  const existing = await peekCartSessionId();

  if (existing) {
    return { sessionId: existing, isNew: false };
  }

  return { sessionId: randomUUID(), isNew: true };
}

export function cartSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.NEXT_PUBLIC_SITE_URL.startsWith("https://"),
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  };
}
