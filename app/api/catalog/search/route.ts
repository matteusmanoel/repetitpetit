import { NextResponse } from "next/server";

import { searchCatalogSuggestions } from "@/features/catalog/data";

/**
 * Autocomplete do header (SS-2). Público — só available|hold via data layer.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  if (q.trim().length < 2) {
    return NextResponse.json({ items: [] });
  }

  const items = await searchCatalogSuggestions(q, 8);
  return NextResponse.json({ items });
}
