import { env } from "@/lib/env";

export interface SupabaseHealth {
  connected: boolean;
  projectRef: string;
  authOk: boolean;
  /** true when the `products` table exists (schema/migrations applied). */
  schemaReady: boolean;
  productCount: number | null;
  detail: string;
}

function projectRefFromUrl(url: string): string {
  try {
    return new URL(url).hostname.split(".")[0];
  } catch {
    return "unknown";
  }
}

/**
 * Verifies live connectivity to the hosted Supabase project using the
 * injected credentials. Distinguishes "connected but schema not applied"
 * (expected before migrations run) from a real connection failure.
 */
export async function checkSupabaseConnection(): Promise<SupabaseHealth> {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const projectRef = projectRefFromUrl(url);

  let authOk = false;
  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: key },
      cache: "no-store",
    });
    authOk = res.ok;
  } catch {
    return {
      connected: false,
      projectRef,
      authOk: false,
      schemaReady: false,
      productCount: null,
      detail: "Falha de rede ao contatar o Supabase.",
    };
  }

  // Probe the products table via PostgREST with an exact count.
  let schemaReady = false;
  let productCount: number | null = null;
  let detail = "Conectado ao Supabase.";
  try {
    const res = await fetch(
      `${url}/rest/v1/products?select=id&limit=1`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Prefer: "count=exact",
        },
        cache: "no-store",
      },
    );
    if (res.ok) {
      schemaReady = true;
      const range = res.headers.get("content-range"); // e.g. "0-0/24"
      const total = range?.split("/")?.[1];
      productCount = total && total !== "*" ? Number(total) : 0;
      detail = "Conectado. Tabela products encontrada.";
    } else {
      const body = await res.json().catch(() => null);
      if (body?.code === "PGRST205") {
        detail =
          "Conectado, mas o schema ainda não foi aplicado (tabela products inexistente).";
      } else {
        detail = `Conectado. Resposta PostgREST: ${res.status}.`;
      }
    }
  } catch {
    detail = "Conectado ao Auth, mas falha ao consultar PostgREST.";
  }

  return {
    connected: authOk,
    projectRef,
    authOk,
    schemaReady,
    productCount,
    detail,
  };
}
