/**
 * Smoke — legacy cart routes are Gone (#96).
 * Hold Session inventory locks live under `/api/hold/*` (see qa-hold-stress.mjs).
 *
 * Usage:
 *   node scripts/smoke-cart-reserve.mjs [baseUrl]
 *
 * Defaults baseUrl to http://127.0.0.1:3000
 */
const baseUrl = process.argv[2] ?? "http://127.0.0.1:3000";
const productId = "9d25a035-6d4b-4d8c-ade1-d2a228f4ffcb";

async function expectGone(path) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ productId }),
  });
  const body = await res.json().catch(() => ({}));
  console.log(path, res.status, body?.error ?? body);
  if (res.status !== 410 || body?.error !== "gone") {
    console.error(`FAIL: expected ${path} → 410 gone`);
    process.exit(1);
  }
  if (typeof body?.message !== "string" || !body.message.includes("Hold Session")) {
    console.error(`FAIL: expected PT-BR Hold Session message on ${path}`);
    process.exit(1);
  }
}

await expectGone("/api/cart/reserve");
await expectGone("/api/cart/release");
console.log("SMOKE OK — legacy cart 410");
