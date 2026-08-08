import { describe, expect, it } from "vitest";

import { classifyOpsChannel } from "@/features/admin/dashboard/ops-channel";

describe("classifyOpsChannel", () => {
  it("maps store / store_counter to balcão", () => {
    expect(classifyOpsChannel("store", "store_counter")).toBe("balcao");
    expect(classifyOpsChannel("store", "pickup")).toBe("balcao");
    expect(classifyOpsChannel("online", "store_counter")).toBe("balcao");
  });

  it("maps delivery and correios to entrega", () => {
    expect(classifyOpsChannel("online", "delivery")).toBe("entrega");
    expect(classifyOpsChannel("online", "correios")).toBe("entrega");
  });

  it("maps pickup to sacolinha", () => {
    expect(classifyOpsChannel("online", "pickup")).toBe("sacolinha");
  });
});
