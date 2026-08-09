import { NextResponse } from "next/server";

import { searchCatalogSuggestions } from "@/features/catalog/data";

/**
 * Autocomplete do header (SS-2). Público — só available|hold via data layer.
 * Sem `q` (ou < 2 chars) devolve peças recentes para abrir o dropdown no foco.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  const items = await searchCatalogSuggestions(q, 8);
  return NextResponse.json({ items });
}
