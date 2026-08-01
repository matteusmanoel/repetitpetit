/**
 * Chama `POST /api/cart/release` no browser (best-effort).
 * Usado ao remover item ou ao expirar a reserva no client.
 */
export async function releaseReservationClient(productId: string): Promise<void> {
  try {
    await fetch("/api/cart/release", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
  } catch (error) {
    console.error("Falha ao liberar reserva no client:", error);
  }
}
