/**
 * Smoke test T13 — concurrency + expired-row cleanup against the live app/DB.
 *
 * Usage:
 *   node scripts/smoke-cart-reserve.mjs [baseUrl]
 *
 * Defaults baseUrl to http://127.0.0.1:3000
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the env
 * (for picking a product id and planting an expired reservation).
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const baseUrl = process.argv[2] ?? "http://127.0.0.1:3000";
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
  const res = await fetch(`${baseUrl}/api/cart/reserve`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: cookieFor(sessionId),
    },
    body: JSON.stringify({ productId }),
  });
  const elapsedMs = performance.now() - started;
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body, elapsedMs, sessionId };
}

async function release(sessionId, productId) {
  const res = await fetch(`${baseUrl}/api/cart/release`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: cookieFor(sessionId),
    },
    body: JSON.stringify({ productId }),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

const { data: products, error: productsError } = await supabase
  .from("products")
  .select("id, slug, status")
  .eq("status", "available")
  .limit(5);

if (productsError || !products?.length) {
  console.error("Could not load available products", productsError);
  process.exit(1);
}

const productId = products[0].id;
console.log("Using product", products[0].slug, productId);

// Cleanup any prior reservation on this product
await supabase.from("cart_reservations").delete().eq("product_id", productId);

// --- Expired-row cleanup (D14) ---
const expiredSession = `smoke-expired-${randomUUID()}`;
const { error: plantError } = await supabase.from("cart_reservations").insert({
  product_id: productId,
  session_id: expiredSession,
  expires_at: new Date(Date.now() - 60_000).toISOString(),
});

if (plantError) {
  console.error("Failed to plant expired reservation", plantError);
  process.exit(1);
}

const afterExpired = await reserve(`smoke-fresh-${randomUUID()}`, productId);
console.log("Expired cleanup reserve:", afterExpired.status, afterExpired.body?.error ?? "ok");

if (afterExpired.status !== 200 || !afterExpired.body?.reservation) {
  console.error("FAIL: expected reserve to succeed after expired row");
  process.exit(1);
}

await release(afterExpired.body.reservation.session_id, productId);
// release uses cookie session; ensure cleanup via service role too
await supabase.from("cart_reservations").delete().eq("product_id", productId);

// --- Concurrent reserve ---
const sessionA = `smoke-a-${randomUUID()}`;
const sessionB = `smoke-b-${randomUUID()}`;

const t0 = performance.now();
const [resultA, resultB] = await Promise.all([
  reserve(sessionA, productId),
  reserve(sessionB, productId),
]);
const wallMs = performance.now() - t0;

console.log("Concurrency wall clock ms:", wallMs.toFixed(1));
console.log("A:", resultA.status, resultA.elapsedMs.toFixed(1), "ms", resultA.body?.error ?? "ok", resultA.body?.reservation?.session_id);
console.log("B:", resultB.status, resultB.elapsedMs.toFixed(1), "ms", resultB.body?.error ?? "ok", resultB.body?.reservation?.session_id);

const statuses = [resultA.status, resultB.status].sort((a, b) => a - b);
const winners = [resultA, resultB].filter((r) => r.status === 200);
const losers = [resultA, resultB].filter((r) => r.status === 409);

if (statuses[0] !== 200 || statuses[1] !== 409 || winners.length !== 1 || losers.length !== 1) {
  console.error("FAIL: expected exactly one 200 and one 409 unavailable");
  process.exit(1);
}

if (losers[0].body?.error !== "unavailable") {
  console.error("FAIL: loser should return error=unavailable");
  process.exit(1);
}

// Release winner and confirm release
const releaseResult = await release(winners[0].sessionId, productId);
console.log("Release:", releaseResult.status, releaseResult.body);

if (releaseResult.status !== 200 || releaseResult.body?.released !== true) {
  console.error("FAIL: expected released=true");
  process.exit(1);
}

// Idempotent second release
const releaseAgain = await release(winners[0].sessionId, productId);
console.log("Release again:", releaseAgain.status, releaseAgain.body);

if (releaseAgain.body?.released !== false) {
  console.error("FAIL: expected released=false on second release");
  process.exit(1);
}

console.log("SMOKE OK");
