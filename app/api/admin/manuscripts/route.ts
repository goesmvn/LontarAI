import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

/** Public manuscripts only, for moderation. Private content is never listed. */
export async function GET(request: NextRequest) {
  const a = await requireAdmin(request);
  if ("error" in a) return a.error;

  const { data, error } = await a.db
    .from("manuscripts")
    .select("id, slug, title, category, regency, village_banjar, owner_name, created_at, leaves(transcription_status, image_path, latin_transliteration, translation_id), manuscript_reports(id, status)")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) return NextResponse.json({ error: "Gagal memuat naskah." }, { status: 500 });

  const items = (data ?? []).map((m) => {
    const leaf = Array.isArray(m.leaves) ? m.leaves[0] : null;
    const reports = Array.isArray(m.manuscript_reports) ? m.manuscript_reports : [];
    return {
      id: m.id, slug: m.slug, title: m.title, category: m.category, regency: m.regency,
      village_banjar: m.village_banjar, owner_name: m.owner_name, created_at: m.created_at,
      status: leaf?.transcription_status ?? "draf_ai",
      latin: leaf?.latin_transliteration ?? "",
      translation_id: leaf?.translation_id ?? "",
      image_url: leaf ? a.db.storage.from("archive").getPublicUrl(leaf.image_path).data.publicUrl : null,
      openReports: reports.filter((r: { status: string }) => r.status === "open").length,
    };
  });
  return NextResponse.json({ items });
}
