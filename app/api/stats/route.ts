import { NextResponse } from "next/server";
import { getServerSupabase, getServiceSupabase, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** Public, aggregate-only numbers for the landing page. Never exposes content. */
export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ configured: false });
  const { data } = await getServerSupabase().from("public_manuscripts").select("regency");
  const rows = data ?? [];
  const regencies = new Set(rows.map((r) => r.regency)).size;

  let vault: number | null = null;
  const svc = getServiceSupabase();
  if (svc) {
    const { count } = await svc.from("manuscripts").select("id", { count: "exact", head: true });
    vault = count ?? null;
  }
  return NextResponse.json({ configured: true, publicCount: rows.length, regencies, totalCount: vault });
}
