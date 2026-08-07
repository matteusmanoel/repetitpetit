import { describe, expect, it } from "vitest";

import { ORDER_TYPE_STANDARD } from "@/features/orders/constants";

describe("ORDER_TYPE_STANDARD (#123 / D113)", () => {
  it("new order paths only write standard — never legacy sacolinha enum", () => {
    expect(ORDER_TYPE_STANDARD).toBe("standard");
    expect(ORDER_TYPE_STANDARD).not.toBe("sacolinha");
  });
});
