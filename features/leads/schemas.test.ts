import { describe, expect, it } from "vitest";

import { leadEmailSchema } from "@/features/leads/schemas";

describe("leadEmailSchema", () => {
  it("normaliza e-mail com trim e lowercase", () => {
    const parsed = leadEmailSchema.safeParse({
      email: "  Ana.Silva@Example.COM ",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.email).toBe("ana.silva@example.com");
    }
  });

  it("rejeita e-mail vazio ou inválido", () => {
    expect(leadEmailSchema.safeParse({ email: "" }).success).toBe(false);
    expect(leadEmailSchema.safeParse({ email: "nao-e-email" }).success).toBe(
      false,
    );
  });
});
