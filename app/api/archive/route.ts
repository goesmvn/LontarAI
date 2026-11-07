import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { getServerSupabase, isSupabaseConfigured } from "@/lib/supabase";

/** Public archive: reads only the `public_manuscripts` view (blurred location, safe columns). */
export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ items: [], configured: false });
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("public_manuscripts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: "Gagal memuat arsip." }, { status: 500 });

  const items = (data ?? []).map((m) => ({
    ...m,
    image_url: supabase.storage.from("archive").getPublicUrl(m.image_path).data.publicUrl,
  }));
  return NextResponse.json({ items, configured: true });
}
