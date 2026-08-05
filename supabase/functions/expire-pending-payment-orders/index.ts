/**
 * Issue #99 — Expire due online pending_payment orders (10 min TTL).
 *
 * Thin Edge Function wrapper around `public.expire_due_pending_payment_orders()`,
 * which cancels the order and releases inventory via SN-02
 * `_finalize_hold_session` (converted Hold Session). Never marks sold.
 *
 * Auth: Supabase gateway JWT verification (pass service_role Bearer).
 * Primary production schedule is pg_cron → SQL RPC; this function is for
 * manual/ops invoke and optional Dashboard schedules.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

type ExpireResult = {
  status: string;
  expired_count?: number;
  failed_count?: number;
  order_ids?: string[];
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");

  if (!serviceRoleKey || !supabaseUrl) {
    return jsonResponse({ error: "missing_env" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc("expire_due_pending_payment_orders");

  if (error) {
    console.error("expire_due_pending_payment_orders failed:", error);
    return jsonResponse({ error: "rpc_failed", message: error.message }, 500);
  }

  const result = (data ?? { status: "ok", expired_count: 0 }) as ExpireResult;
  return jsonResponse(result, 200);
});

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
