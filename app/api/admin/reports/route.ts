import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const a = await requireAdmin(request);
  if ("error" in a) return a.error;
  const { data, error } = await a.db
    .from("manuscript_reports")
    .select("id, reason, details, status, created_at, manuscripts(id, slug, title, visibility)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: "Gagal memuat laporan." }, { status: 500 });
  return NextResponse.json({ items: data });
}
