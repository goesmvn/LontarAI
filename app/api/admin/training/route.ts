import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

/** Admin review queue of DONATED samples only (never other private vault content). */
export async function GET(request: NextRequest) {
  const a = await requireAdmin(request);
  if ("error" in a) return a.error;
  const review = request.nextUrl.searchParams.get("review") ?? "pending";
  const { data, error } = await a.db
    .from("training_samples").select("id, line_index, image_path, latin, unicode, origin, review, created_at")
    .eq("review", review).order("created_at", { ascending: false }).limit(60);
  if (error) return NextResponse.json({ error: "Gagal memuat data latih." }, { status: 500 });
  const items = await Promise.all((data ?? []).map(async (r) => {
    const { data: s } = await a.db.storage.from("training").createSignedUrl(r.image_path, 3600);
    return { ...r, image_url: s?.signedUrl ?? null };
  }));
  const counts: Record<string, number> = {};
  for (const k of ["pending", "approved", "rejected"]) {
    const { count } = await a.db.from("training_samples").select("id", { count: "exact", head: true }).eq("review", k);
    counts[k] = count ?? 0;
  }
  return NextResponse.json({ items, counts });
}
