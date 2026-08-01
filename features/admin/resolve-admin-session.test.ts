import type { User } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { resolveAdminSession, type AdminRow } from "@/features/admin/resolve-admin-session";

function createFakeUser(id: string): User {
  return {
    id,
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-08-01T00:00:00.000Z",
  };
}

function createFakeAdminRow(overrides: Partial<AdminRow> = {}): AdminRow {
  return {
    id: "admin-row-1",
    auth_user_id: "user-1",
    email: "admin@repetipetit.com.br",
    full_name: "Admin de Teste",
    is_active: true,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("resolveAdminSession", () => {
  it("returns a session when the user and an active, matching admin row exist", () => {
    const user = createFakeUser("user-1");
    const adminRow = createFakeAdminRow({ auth_user_id: "user-1" });

    const session = resolveAdminSession(user, adminRow);

    expect(session).toEqual({ user, admin: adminRow });
  });

  it("returns null when there is no authenticated user", () => {
    const adminRow = createFakeAdminRow({ auth_user_id: "user-1" });

    expect(resolveAdminSession(null, adminRow)).toBeNull();
  });

  it("returns null when there is no matching admins row", () => {
    const user = createFakeUser("user-1");

    expect(resolveAdminSession(user, null)).toBeNull();
  });

  it("returns null when the admins row is inactive", () => {
    const user = createFakeUser("user-1");
    const adminRow = createFakeAdminRow({ auth_user_id: "user-1", is_active: false });

    expect(resolveAdminSession(user, adminRow)).toBeNull();
  });

  it("returns null when the admins row belongs to a different auth_user_id", () => {
    const user = createFakeUser("user-1");
    const adminRow = createFakeAdminRow({ auth_user_id: "some-other-user" });

    expect(resolveAdminSession(user, adminRow)).toBeNull();
  });

  it("returns null when both user and admin row are missing", () => {
    expect(resolveAdminSession(null, null)).toBeNull();
  });
});
