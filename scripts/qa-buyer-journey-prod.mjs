/**
 * Prod buyer-journey smoke: catalog → hold → checkout → assert MP sandbox host.
 * Usage: pnpm dlx playwright@1.49.1 install chromium && \
 *   node scripts/qa-buyer-journey-prod.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "https://repetitpetit.vercel.app";

const browser = await chromium.launch({ headless: true, channel: "chrome" });
const page = await browser.newPage();
const errors = [];

page.on("pageerror", (e) => errors.push(String(e)));

try {
  await page.goto(`${BASE}/catalogo`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForTimeout(2000);

  const empty = await page.getByText("Nenhuma peça disponível").isVisible().catch(() => false);
  if (empty) {
    throw new Error("Catalog empty on production");
  }

  const productLink = page.locator('a[href^="/produto/"]').first();
  await productLink.waitFor({ state: "visible", timeout: 30_000 });
  const href = await productLink.getAttribute("href");
  console.log("open product", href);
  await productLink.click();
  await page.waitForURL(/\/produto\//, { timeout: 30_000 });

  // Hold CTA — Comprar Agora or Adicionar / reservar
  const buy = page.getByRole("button", { name: /Comprar Agora|Adicionar|Reservar/i }).first();
  await buy.waitFor({ state: "visible", timeout: 20_000 });
  await buy.click();

  // May open sheet — go to checkout
  const checkoutCta = page.getByRole("link", { name: /Finalizar|checkout|Ver reservas|carrinho/i }).first();
  const checkoutBtn = page.getByRole("button", { name: /Finalizar compra|Ir para o checkout/i }).first();
  if (await checkoutCta.isVisible().catch(() => false)) {
    await checkoutCta.click();
  } else if (await checkoutBtn.isVisible().catch(() => false)) {
    await checkoutBtn.click();
  } else {
    await page.goto(`${BASE}/checkout`);
  }

  await page.waitForURL(/\/checkout/, { timeout: 30_000 });
  console.log("on checkout", page.url());

  // Fill minimal checkout fields if present
  const fillIf = async (label, value) => {
    const el = page.getByLabel(label, { exact: false }).first();
    if (await el.isVisible().catch(() => false)) {
      await el.fill(value);
    }
  };

  await fillIf("Nome", "QA Sandbox");
  await fillIf("E-mail", "qa.sandbox@example.com");
  await fillIf("WhatsApp", "45999999999");
  await fillIf("CEP", "85851000");
  await page.waitForTimeout(1500);
  // address may autofill via ViaCEP
  await fillIf("Número", "100");

  // Submit / pay
  const pay = page.getByRole("button", { name: /Pagar|Mercado Pago|Finalizar pedido|Continuar/i }).first();
  await pay.waitFor({ state: "visible", timeout: 20_000 });
  await pay.click();

  // Expect redirect to MP
  await page.waitForURL(/mercadopago\.com/, { timeout: 60_000 });
  const host = new URL(page.url()).host;
  console.log(JSON.stringify({ mpHost: host, url: page.url().slice(0, 120), pageErrors: errors.slice(0, 5) }, null, 2));

  if (host !== "sandbox.mercadopago.com.br") {
    process.exitCode = 1;
    console.error("FAIL: expected sandbox.mercadopago.com.br, got", host);
  } else {
    console.log("PASS: redirected to Mercado Pago sandbox");
  }
} catch (e) {
  console.error("FAIL:", e);
  await page.screenshot({ path: "/tmp/qa-buyer-fail.png", fullPage: true }).catch(() => {});
  console.error("screenshot /tmp/qa-buyer-fail.png");
  process.exitCode = 1;
} finally {
  await browser.close();
}
