import { NextResponse } from "next/server";

import { peekCartSessionId } from "@/features/cart";
import { getHoldSession } from "@/features/cart/hold-session";
import { createServiceSupabaseClient } from "@/lib/supabase/server-service";

export type HoldSessionApiItem = {
  productId: string;
  holdItemId: string;
  name: string;
  slug: string;
  price: number;
  coverImageUrl: string | null;
};

/**
 * `GET /api/hold/session` — hydrate CartSheet from cookie `rp_cart_session` (D79).
 * Service role reads active Hold Session + product display fields.
 */
export async function GET() {
  const sessionId = await peekCartSessionId();

  if (!sessionId) {
    return NextResponse.json({ session: null });
  }

  try {
    const snapshot = await getHoldSession(sessionId);

    if (!snapshot || snapshot.items.length === 0) {
      return NextResponse.json({ session: null });
    }

    const productIds = snapshot.items.map((item) => item.product_id);
    const supabase = createServiceSupabaseClient();
    const { data: products, error } = await supabase
      .from("products")
      .select("id, name, slug, price, cover_image_url")
      .in("id", productIds);

    if (error) {
      console.error("GET /api/hold/session products:", error);
      return NextResponse.json(
        { error: "internal_error", message: "Falha ao carregar peças da reserva." },
        { status: 500 },
      );
    }

    const productById = new Map((products ?? []).map((p) => [p.id, p]));
    const items: HoldSessionApiItem[] = [];

    for (const holdItem of snapshot.items) {
      const product = productById.get(holdItem.product_id);
      if (!product) continue;
      items.push({
        productId: product.id,
        holdItemId: holdItem.id,
        name: product.name,
        slug: product.slug,
        price: Number(product.price),
        coverImageUrl: product.cover_image_url,
      });
    }

    if (items.length === 0) {
      return NextResponse.json({ session: null });
    }

    return NextResponse.json({
      session: {
        holdSessionId: snapshot.session.id,
        expiresAt: snapshot.session.expires_at,
        items,
      },
    });
  } catch (error) {
    console.error("Erro inesperado em GET /api/hold/session:", error);
    return NextResponse.json(
      { error: "internal_error", message: "Erro inesperado ao carregar a reserva." },
      { status: 500 },
    );
  }
}
