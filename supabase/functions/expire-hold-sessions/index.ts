/**
 * SN-03 — Expire due Hold Sessions.
 *
 * Thin Edge Function wrapper around `public.expire_due_hold_sessions()`,
 * which calls SN-02 `_finalize_hold_session(..., 'expired')` for each due row.
 * Do not duplicate hold_items / products.status mutation here (D75).
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
  hold_session_ids?: string[];
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

  const { data, error } = await supabase.rpc("expire_due_hold_sessions");

  if (error) {
    console.error("expire_due_hold_sessions failed:", error);
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
