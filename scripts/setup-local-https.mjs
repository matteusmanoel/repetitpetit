#!/usr/bin/env node
/**
 * Gera certificados locais (mkcert) para HTTPS no `pnpm dev:https`.
 * Inclui localhost + <LocalHostName>.local para teste no iPhone na LAN.
 *
 * Pré-requisito: `brew install mkcert`
 * Uma vez no Mac (pede senha): `mkcert -install`
 */

import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const certsDir = join(root, ".certs");
const keyPath = join(certsDir, "dev-key.pem");
const certPath = join(certsDir, "dev-cert.pem");
const caDest = join(certsDir, "rootCA.pem");

function run(cmd, args, opts = {}) {
  const out = execFileSync(cmd, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...opts,
  });
  if (out == null) return "";
  return String(out).trim();
}

function whichMkcert() {
  try {
    return run("which", ["mkcert"]);
  } catch {
    console.error("mkcert não encontrado. Instale com: brew install mkcert");
    process.exit(1);
  }
}

function localHostNames() {
  const names = new Set(["localhost", "127.0.0.1", "::1"]);
  try {
    const short = run("scutil", ["--get", "LocalHostName"]);
    if (short) names.add(`${short}.local`);
  } catch {
    /* ignore */
  }
  try {
    const host = run("hostname", []);
    if (host) {
      names.add(host);
      if (!host.endsWith(".local") && !host.includes(".")) {
        names.add(`${host}.local`);
      }
    }
  } catch {
    /* ignore */
  }
  return [...names];
}

whichMkcert();
mkdirSync(certsDir, { recursive: true });

const hosts = localHostNames();
console.log("Gerando certificado para:", hosts.join(", "));

run("mkcert", ["-key-file", keyPath, "-cert-file", certPath, ...hosts], {
  stdio: "inherit",
});

const caRoot = run("mkcert", ["-CAROOT"]);
const caSrc = join(caRoot, "rootCA.pem");
if (!existsSync(caSrc)) {
  console.error(`CA não encontrada em ${caSrc}. Rode: mkcert -install`);
  process.exit(1);
}
copyFileSync(caSrc, caDest);

console.log(`
Pronto.
  cert: ${certPath}
  key:  ${keyPath}
  CA:   ${caDest}

No Mac (uma vez, pede senha admin):
  mkcert -install

No iPhone (confiança no CA local):
  1. AirDrop/envie ${caDest} (ou ${caSrc}) para o iPhone
  2. Abrir o arquivo → Ajustes → Perfil baixado → Instalar
  3. Ajustes → Geral → Sobre → Certificados Confiáveis → ativar o mkcert

Depois:
  pnpm dev:https
  Abrir no iPhone: https://macteus.local:3000/admin/produtos/intake-ia
  (ajuste o hostname se o seu .local for outro)

Opcional em .env.local durante o teste:
  NEXT_PUBLIC_SITE_URL=https://macteus.local:3000
`);
