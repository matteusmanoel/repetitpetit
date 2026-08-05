/**
 * QA — which Checkout Pro host would we send buyers to?
 * Usage: node --env-file=.env scripts/qa-mp-pref-hosts.mjs
 */
const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
const sb = process.env.MERCADOPAGO_SANDBOX;

if (!token || !site) {
  console.error("Missing MERCADOPAGO_ACCESS_TOKEN or NEXT_PUBLIC_SITE_URL");
  process.exit(1);
}

const meRes = await fetch("https://api.mercadopago.com/users/me", {
  headers: { Authorization: `Bearer ${token}` },
});
const me = await meRes.json();
const isTest = Array.isArray(me.tags) && me.tags.includes("test_user");
const forceSandbox =
  token.startsWith("TEST-") ||
  sb === "1" ||
  sb === "true" ||
  sb === "yes";

const prefRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    items: [
      {
        title: "QA smoke",
        quantity: 1,
        unit_price: 1,
        currency_id: "BRL",
      },
    ],
    external_reference: `qa-smoke-${Date.now()}`,
    back_urls: {
      success: `${site}/checkout/sucesso`,
      failure: `${site}/checkout`,
      pending: `${site}/checkout/sucesso`,
    },
    auto_return: "approved",
    notification_url: `${site}/api/webhooks/mercadopago`,
  }),
});

const pref = await prefRes.json();
const init = pref.init_point ?? null;
const sand = pref.sandbox_init_point ?? null;
const useSandbox = (forceSandbox || isTest) && Boolean(sand);
const chosen = useSandbox ? sand : init;

console.log(
  JSON.stringify(
    {
      tokenPrefix: token.slice(0, 8),
      MERCADOPAGO_SANDBOX: sb ?? null,
      sellerNickname: me.nickname ?? null,
      sellerIsTestUser: isTest,
      preferenceHttp: prefRes.status,
      initHost: init ? new URL(init).host : null,
      sandboxHost: sand ? new URL(sand).host : null,
      appWouldChoose: chosen ? new URL(chosen).host : null,
      note:
        "Paying on sandbox with a REAL Mercado Pago login → error 'Uma das partes… é de teste'. Use guest test card (APRO) or TESTUSER buyer.",
    },
    null,
    2,
  ),
);
