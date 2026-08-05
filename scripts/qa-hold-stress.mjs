/**
 * QA / stress — concurrent Hold Session reserves against a public base URL.
 *
 * Usage:
 *   node --env-file=.env scripts/qa-hold-stress.mjs [baseUrl] [concurrency]
 *
 * Defaults: https://repetitpetit.vercel.app, concurrency 20
 * Loads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY for product pick + cleanup.
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const baseUrl = (process.argv[2] ?? "https://repetitpetit.vercel.app").replace(
  /\/$/,
  "",
);
const concurrency = Number(process.argv[3] ?? 20);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function cookieFor(sessionId) {
  return `rp_cart_session=${sessionId}`;
}

async function reserve(sessionId, productId) {
  const started = performance.now();
  const res = await fetch(`${baseUrl}/api/hold/reserve`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: cookieFor(sessionId),
    },
    body: JSON.stringify({ productId }),
  });
  const elapsedMs = Math.round(performance.now() - started);
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body, elapsedMs, sessionId };
}

async function release(sessionId, productId) {
  const res = await fetch(`${baseUrl}/api/hold/release`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: cookieFor(sessionId),
    },
    body: JSON.stringify({ productId }),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function getSession(sessionId) {
  const res = await fetch(`${baseUrl}/api/hold/session`, {
    headers: { cookie: cookieFor(sessionId) },
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

const { data: products, error: productsError } = await supabase
  .from("products")
  .select("id, slug, status, staff_code")
  .eq("status", "available")
  .limit(10);

if (productsError || !products?.length) {
  console.error("Could not load available products", productsError);
  process.exit(1);
}

const product = products[0];
const productId = product.id;
console.log("baseUrl", baseUrl);
console.log("concurrency", concurrency);
console.log("product", product.slug, product.staff_code, productId);

// Ensure clean state via release of any active hold on this product (service)
const { data: activeItem } = await supabase
  .from("hold_items")
  .select("hold_session_id, hold_sessions!inner(session_id, status)")
  .eq("product_id", productId)
  .eq("hold_sessions.status", "active")
  .maybeSingle();

if (activeItem?.hold_sessions?.session_id) {
  console.log("Releasing prior active hold via API…");
  await release(activeItem.hold_sessions.session_id, productId);
  await supabase
    .from("products")
    .update({ status: "available" })
    .eq("id", productId)
    .eq("status", "hold");
}

const sessions = Array.from({ length: concurrency }, () => `qa-stress-${randomUUID()}`);
const started = performance.now();
const results = await Promise.all(sessions.map((s) => reserve(s, productId)));
const totalMs = Math.round(performance.now() - started);

const ok = results.filter((r) => r.status === 200 && r.body?.holdSessionId);
const conflict = results.filter((r) => r.status === 409);
const other = results.filter((r) => r.status !== 200 && r.status !== 409);

console.log("--- concurrent reserve ---");
console.log("ok", ok.length, "conflict", conflict.length, "other", other.length);
console.log("wall_ms", totalMs);
console.log(
  "latency_ms",
  results.map((r) => r.elapsedMs).sort((a, b) => a - b).join(","),
);

if (ok.length !== 1) {
  console.error("FAIL: expected exactly 1 winner, got", ok.length);
  for (const r of other.slice(0, 5)) {
    console.error("other sample", r.status, r.body);
  }
  process.exitCode = 1;
} else {
  console.log("PASS: single winner");
}

const winner = ok[0];
const sessionCheck = await getSession(winner.sessionId);
console.log("winner session GET", sessionCheck.status, {
  itemCount: sessionCheck.body?.items?.length ?? sessionCheck.body?.itemCount,
  expiresAt: sessionCheck.body?.expiresAt ?? sessionCheck.body?.expires_at,
});

// Max-5 limit: try to fill 5 then 6th
const filler = products.slice(1, 6);
const limitSession = `qa-limit-${randomUUID()}`;
const fillResults = [];
for (const p of filler) {
  fillResults.push(await reserve(limitSession, p.id));
}
const sixth = products[6] ?? products[1];
// if we only have fewer products, skip
if (filler.length >= 5 && products.length >= 6) {
  // need 5 available — release winner first so we have stock
  await release(winner.sessionId, productId);
  const fillSession = `qa-limit5-${randomUUID()}`;
  const five = products.slice(0, 5);
  const filled = [];
  for (const p of five) {
    filled.push(await reserve(fillSession, p.id));
  }
  const sixthTry = await reserve(fillSession, products[5].id);
  console.log("--- max 5 ---");
  console.log(
    "filled_ok",
    filled.filter((r) => r.status === 200).length,
    "sixth",
    sixthTry.status,
    sixthTry.body?.error,
  );
  if (
    filled.filter((r) => r.status === 200).length !== 5 ||
    sixthTry.status !== 409 ||
    sixthTry.body?.error !== "limit_reached"
  ) {
    console.error("FAIL: max-5 limit");
    process.exitCode = 1;
  } else {
    console.log("PASS: max-5");
  }
  // cleanup
  for (const p of five) {
    await release(fillSession, p.id);
  }
} else {
  console.log("SKIP max-5 (need ≥6 available products)");
  if (winner) await release(winner.sessionId, productId);
}

// Legacy cart must be Gone (#96) — Hold Session is the only inventory lock.
const legacy = await fetch(`${baseUrl}/api/cart/reserve`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    cookie: cookieFor(`qa-legacy-${randomUUID()}`),
  },
  body: JSON.stringify({ productId: products[products.length - 1].id }),
});
const legacyBody = await legacy.json().catch(() => ({}));
console.log("--- legacy /api/cart/reserve ---", legacy.status, legacyBody?.error ?? "ok?");
if (legacy.status !== 410 || legacyBody?.error !== "gone") {
  console.error("FAIL: expected legacy /api/cart/reserve → 410 gone");
  process.exitCode = 1;
} else {
  console.log("PASS: legacy cart 410");
}

const legacyRelease = await fetch(`${baseUrl}/api/cart/release`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    cookie: cookieFor("noop"),
  },
  body: JSON.stringify({ productId: products[products.length - 1].id }),
});
const legacyReleaseBody = await legacyRelease.json().catch(() => ({}));
if (legacyRelease.status !== 410 || legacyReleaseBody?.error !== "gone") {
  console.error("FAIL: expected legacy /api/cart/release → 410 gone");
  process.exitCode = 1;
}

const { data: statusRow } = await supabase
  .from("products")
  .select("id, status")
  .eq("id", productId)
  .single();
console.log("product final status", statusRow?.status);

console.log(process.exitCode ? "SMOKE FAIL" : "SMOKE OK");
process.exit(process.exitCode ?? 0);
