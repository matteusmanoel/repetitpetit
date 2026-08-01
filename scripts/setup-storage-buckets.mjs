#!/usr/bin/env node
/**
 * Cria (de forma idempotente) os buckets de Supabase Storage usados pelo app.
 *
 * Script de operação, roda uma única vez por ambiente Supabase (dev/staging/prod)
 * — não faz parte do build nem do runtime do Next.js. Por isso lê
 * `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` direto de `process.env`
 * em vez de `lib/env.ts` (a regra "nunca acessar process.env fora de lib/env.ts",
 * docs/06-agent-playbook.md, vale para código do app; scripts standalone de infra
 * não passam pelo bundler do Next e não têm acesso a esse módulo sem um runtime
 * TypeScript extra — ver docs/09-decisions.md).
 *
 * Uso:
 *   node scripts/setup-storage-buckets.mjs
 *
 * Requer no ambiente: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente antes de rodar este script.",
  );
  process.exit(1);
}

// Mantido em sincronia manualmente com UPLOAD_BUCKETS em lib/supabase/upload-buckets.ts.
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB

const BUCKETS = [
  { id: "product-images", public: true },
  { id: "intake-photos", public: true },
];

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    console.error("Falha ao listar buckets existentes:", listError.message);
    process.exit(1);
  }

  const existingIds = new Set((existingBuckets ?? []).map((bucket) => bucket.id));

  for (const bucket of BUCKETS) {
    if (existingIds.has(bucket.id)) {
      console.log(`Bucket "${bucket.id}" já existe — pulando criação.`);
      continue;
    }

    const { error } = await supabase.storage.createBucket(bucket.id, {
      public: bucket.public,
      fileSizeLimit: MAX_FILE_SIZE_BYTES,
      allowedMimeTypes: ALLOWED_MIME_TYPES,
    });

    if (error) {
      console.error(`Falha ao criar bucket "${bucket.id}":`, error.message);
      process.exit(1);
    }

    console.log(`Bucket "${bucket.id}" criado com sucesso (public=${bucket.public}).`);
  }

  console.log("Setup de buckets concluído.");
}

main();
