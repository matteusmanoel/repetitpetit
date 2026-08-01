import { describe, expect, it } from "vitest";

import { resetRequestSchema, signInSchema } from "@/features/admin/schemas";

describe("signInSchema", () => {
  it("accepts a valid email and password", () => {
    const result = signInSchema.safeParse({
      email: "admin@repetipetit.com.br",
      password: "senha-forte-123",
    });

    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = signInSchema.safeParse({
      email: "not-an-email",
      password: "senha-forte-123",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a password shorter than 6 characters", () => {
    const result = signInSchema.safeParse({
      email: "admin@repetipetit.com.br",
      password: "123",
    });

    expect(result.success).toBe(false);
  });

  it("rejects when email is missing", () => {
    const result = signInSchema.safeParse({ password: "senha-forte-123" });

    expect(result.success).toBe(false);
  });

  it("rejects when password is missing", () => {
    const result = signInSchema.safeParse({ email: "admin@repetipetit.com.br" });

    expect(result.success).toBe(false);
  });

  it("rejects values coming from FormData as null (unchecked field)", () => {
    const result = signInSchema.safeParse({ email: null, password: null });

    expect(result.success).toBe(false);
  });
});

describe("resetRequestSchema", () => {
  it("accepts a valid email", () => {
    const result = resetRequestSchema.safeParse({
      email: "admin@repetipetit.com.br",
    });

    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = resetRequestSchema.safeParse({ email: "nope" });

    expect(result.success).toBe(false);
  });

  it("rejects a missing email", () => {
    const result = resetRequestSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("rejects a non-object body (e.g. null from an unparseable request)", () => {
    const result = resetRequestSchema.safeParse(null);

    expect(result.success).toBe(false);
  });
});
