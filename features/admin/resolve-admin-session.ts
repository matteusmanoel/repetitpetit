import type { User } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

export type AdminRow = Database["public"]["Tables"]["admins"]["Row"];

export type AdminSession = {
  user: User;
  admin: AdminRow;
};

/**
 * Combina o usuário autenticado do Supabase Auth com sua linha em `admins`.
 *
 * Retorna `null` quando não há usuário, quando não existe linha
 * correspondente em `admins`, quando a linha está com `is_active = false`,
 * ou quando o `auth_user_id` da linha não corresponde ao usuário informado.
 *
 * Função pura, sem I/O — separada de `features/admin/session.ts` (que importa
 * `"server-only"`) para ser testável com vitest em ambiente Node puro, sem
 * quebrar a proteção de client/server boundary (ver `resolve-admin-session.test.ts`).
 */
export function resolveAdminSession(
  user: User | null,
  adminRow: AdminRow | null,
): AdminSession | null {
  if (!user || !adminRow) {
    return null;
  }

  if (!adminRow.is_active) {
    return null;
  }

  if (adminRow.auth_user_id !== user.id) {
    return null;
  }

  return { user, admin: adminRow };
}
