import { NextResponse } from "next/server";
import { checkSupabaseConnection } from "@/lib/supabase/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await checkSupabaseConnection();
  const ok = supabase.connected;
  return NextResponse.json(
    { status: ok ? "ok" : "degraded", supabase },
    { status: ok ? 200 : 503 },
  );
}
