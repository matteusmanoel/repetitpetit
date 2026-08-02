import "server-only";

import { loadEnv, type Env, type PublicEnv } from "@/lib/env/load-server";

export { loadEnv, type Env, type PublicEnv };

/** Env completo tipado — server-only (não importe em Client Components). */
export const env: Env = loadEnv(process.env);
