import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const a = await requireAdmin(request);
  if ("error" in a) return a.error;

  const [ms, leaves, reports] = await Promise.all([
    a.db.from("manuscripts").select("visibility, is_pingit, category, regency"),
    a.db.from("leaves").select("transcription_status"),
    a.db.from("manuscript_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
  ]);
  if (ms.error || leaves.error) return NextResponse.json({ error: "Gagal memuat statistik." }, { status: 500 });

  const tally = (rows: Record<string, unknown>[], key: string) =>
    rows.reduce<Record<string, number>>((acc, r) => {
      const k = String(r[key]);
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});

  const rows = ms.data ?? [];
  return NextResponse.json({
    email: a.email,
    total: rows.length,
    public: rows.filter((r) => r.visibility === "public").length,
    private: rows.filter((r) => r.visibility === "private").length,
    pingit: rows.filter((r) => r.is_pingit).length,
    openReports: reports.count ?? 0,
    byStatus: tally(leaves.data ?? [], "transcription_status"),
    byCategory: tally(rows, "category"),
    byRegency: tally(rows.filter((r) => r.visibility === "public"), "regency"),
  });
}
