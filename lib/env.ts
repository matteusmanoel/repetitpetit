/**
 * Barrel server-only: `import { env } from "@/lib/env"`.
 *
 * Client Components devem usar `import { publicEnv } from "@/lib/env/public"`.
 * Importar este arquivo no browser falha de propósito (`server-only`).
 */
export { env, loadEnv, type Env, type PublicEnv } from "@/lib/env/server";
