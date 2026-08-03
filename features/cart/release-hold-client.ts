/**
 * Browser helpers for SN-02 Hold Session release routes.
 */

export async function releaseHoldItemClient(productId: string): Promise<void> {
  try {
    await fetch("/api/hold/release", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
  } catch (error) {
    console.error("Falha ao liberar peça da Hold Session:", error);
  }
}

export async function releaseHoldSessionClient(
  finalStatus: "cancelled" | "expired" = "expired",
): Promise<void> {
  try {
    await fetch("/api/hold/release", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ releaseSession: true, finalStatus }),
    });
  } catch (error) {
    console.error("Falha ao liberar Hold Session:", error);
  }
}
