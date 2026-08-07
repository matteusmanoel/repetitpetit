import { describe, expect, it } from "vitest";

import { buildEscPosLabel } from "@/features/print/escpos";
import {
  createOfflineThermalBridge,
  resolveThermalPrintBridge,
} from "@/features/print/bridge";
import {
  applyPrintAttempt,
  canRetryPrintJob,
  isPrintBatchComplete,
  pickNextPrintJob,
} from "@/features/print/queue";

describe("label print queue", () => {
  const jobs = [
    {
      id: "2",
      status: "pending" as const,
      attempt_count: 0,
      max_attempts: 2,
      sort_order: 1,
    },
    {
      id: "1",
      status: "pending" as const,
      attempt_count: 0,
      max_attempts: 2,
      sort_order: 0,
    },
  ];

  it("picks lowest sort_order pending job", () => {
    expect(pickNextPrintJob(jobs)?.id).toBe("1");
  });

  it("retries failed jobs under max_attempts", () => {
    const failed = {
      id: "1",
      status: "failed" as const,
      attempt_count: 1,
      max_attempts: 2,
      sort_order: 0,
    };
    expect(canRetryPrintJob(failed)).toBe(true);
    expect(pickNextPrintJob([failed])?.id).toBe("1");
  });

  it("does not retry exhausted failures", () => {
    const failed = {
      id: "1",
      status: "failed" as const,
      attempt_count: 2,
      max_attempts: 2,
      sort_order: 0,
    };
    expect(canRetryPrintJob(failed)).toBe(false);
    expect(pickNextPrintJob([failed])).toBeNull();
    expect(isPrintBatchComplete([failed])).toBe(true);
  });

  it("applies ACK success and failure", () => {
    const base = {
      id: "1",
      status: "printing" as const,
      attempt_count: 0,
      max_attempts: 2,
      sort_order: 0,
    };
    expect(applyPrintAttempt(base, { ok: true }).status).toBe("printed");
    const fail = applyPrintAttempt(base, { ok: false, error: "offline" });
    expect(fail.status).toBe("failed");
    expect(fail.attempt_count).toBe(1);
    expect(fail.last_error).toBe("offline");
  });
});

describe("escpos + bridge", () => {
  it("builds non-empty ESC/POS bytes without price", () => {
    const bytes = buildEscPosLabel({
      storeName: "Repeti Petit",
      staffCode: "RP-000001",
      productName: "Casaco azul",
      sizeLabel: "2 anos",
      passportUrl: "https://example.com/admin/passport/RP-000001",
    });
    expect(bytes.byteLength).toBeGreaterThan(40);
    const asText = Buffer.from(bytes).toString("latin1");
    expect(asText).toContain("RP-000001");
    expect(asText).not.toContain("R$");
  });

  it("offline bridge marks unavailable and fails print", async () => {
    const bridge = createOfflineThermalBridge();
    expect(await bridge.isAvailable()).toBe(false);
    const result = await bridge.printLabel({
      storeName: "Repeti Petit",
      staffCode: "RP-000001",
      productName: "X",
      sizeLabel: "P",
      passportUrl: "https://example.com/p",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.offline).toBe(true);
  });

  it("resolves to offline when bridge URL missing", async () => {
    const bridge = resolveThermalPrintBridge(undefined);
    const result = await bridge.printLabel({
      storeName: "Repeti Petit",
      staffCode: "RP-000002",
      productName: "Y",
      sizeLabel: "M",
      passportUrl: "https://example.com/p",
    });
    expect(result.ok).toBe(false);
  });
});
