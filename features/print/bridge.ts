/**
 * Thermal print bridge abstraction (SO-04 / D107).
 * Vercel never talks USB — local bridge (model TBD) or offline stub.
 */

import { buildEscPosLabel, type EscPosLabelPayload } from "@/features/print/escpos";

export type ThermalPrintResult =
  | { ok: true }
  | { ok: false; error: string; offline?: boolean };

export type ThermalPrintBridge = {
  /** Whether a local ESC/POS endpoint is reachable. */
  isAvailable: () => Promise<boolean>;
  /** Send one label; must resolve with ACK or failure (no throw for offline). */
  printLabel: (payload: EscPosLabelPayload) => Promise<ThermalPrintResult>;
};

/**
 * Default bridge when no local printer agent is configured.
 * Marks jobs failed so product creation is preserved (SO-04).
 */
export function createOfflineThermalBridge(
  reason = "Impressora térmica offline ou bridge não configurada.",
): ThermalPrintBridge {
  return {
    async isAvailable() {
      return false;
    },
    async printLabel() {
      return { ok: false, error: reason, offline: true };
    },
  };
}

/**
 * HTTP bridge to a local ESC/POS agent (homolog on store machine).
 * Env: THERMAL_PRINT_BRIDGE_URL (optional) — when missing, use offline.
 */
export function createHttpThermalBridge(
  bridgeUrl: string,
): ThermalPrintBridge {
  const base = bridgeUrl.replace(/\/$/, "");

  return {
    async isAvailable() {
      try {
        const response = await fetch(`${base}/health`, {
          method: "GET",
          signal: AbortSignal.timeout(2000),
        });
        return response.ok;
      } catch {
        return false;
      }
    },
    async printLabel(payload) {
      const available = await this.isAvailable();
      if (!available) {
        return {
          ok: false,
          error: "Bridge térmica inacessível (offline).",
          offline: true,
        };
      }

      try {
        const bytes = buildEscPosLabel(payload);
        const response = await fetch(`${base}/print`, {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: Buffer.from(bytes),
          signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          return {
            ok: false,
            error: text || `Bridge retornou HTTP ${response.status}.`,
          };
        }

        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Falha ao enviar para a bridge térmica.",
          offline: true,
        };
      }
    },
  };
}

/**
 * Resolve bridge: HTTP if URL provided and reachable path configured,
 * otherwise offline (safe default for Cloud/Vercel).
 */
export function resolveThermalPrintBridge(
  bridgeUrl: string | undefined,
): ThermalPrintBridge {
  if (bridgeUrl && bridgeUrl.trim().length > 0) {
    return createHttpThermalBridge(bridgeUrl.trim());
  }
  return createOfflineThermalBridge();
}
