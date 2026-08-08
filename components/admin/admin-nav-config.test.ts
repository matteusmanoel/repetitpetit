import { describe, expect, it } from "vitest";

import {
  adminInitials,
  adminPageSubtitle,
  isAdminNavActive,
} from "@/components/admin/admin-nav-config";

describe("isAdminNavActive", () => {
  it("matches Painel exactly", () => {
    expect(isAdminNavActive("/admin", "/admin", "exact")).toBe(true);
    expect(isAdminNavActive("/admin/pedidos", "/admin", "exact")).toBe(false);
  });

  it("keeps Em massa and Produtos disjoint", () => {
    expect(
      isAdminNavActive(
        "/admin/produtos/intake-ia",
        "/admin/produtos/intake-ia",
        "em-massa",
      ),
    ).toBe(true);
    expect(
      isAdminNavActive(
        "/admin/produtos/intake-ia",
        "/admin/produtos",
        "produtos",
      ),
    ).toBe(false);
    expect(
      isAdminNavActive("/admin/produtos/novo", "/admin/produtos", "produtos"),
    ).toBe(true);
    expect(
      isAdminNavActive(
        "/admin/produtos/novo",
        "/admin/produtos/intake-ia",
        "em-massa",
      ),
    ).toBe(false);
  });

  it("matches Separação by prefix", () => {
    expect(
      isAdminNavActive("/admin/pedidos", "/admin/pedidos", "prefix"),
    ).toBe(true);
  });
});

describe("adminPageSubtitle", () => {
  it("labels primary surfaces in PT-BR", () => {
    expect(adminPageSubtitle("/admin")).toBe("Painel");
    expect(adminPageSubtitle("/admin/pedidos")).toBe("Separação");
    expect(adminPageSubtitle("/admin/produtos/intake-ia")).toBe(
      "Cadastro em massa",
    );
    expect(adminPageSubtitle("/admin/produtos")).toBe("Produtos");
  });
});

describe("adminInitials", () => {
  it("uses name parts when available", () => {
    expect(adminInitials("Maria Silva", "a@b.com")).toBe("MS");
    expect(adminInitials(null, "loja@repeti.com")).toBe("LO");
  });
});
