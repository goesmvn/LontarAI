import { NextResponse } from "next/server";
import { getServerSupabase, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Belum dikonfigurasi." }, { status: 503 });
  const supabase = getServerSupabase();
  const { data } = await supabase.from("public_manuscripts").select("*").eq("slug", params.slug).maybeSingle();
  if (!data) return NextResponse.json({ error: "Naskah tidak ditemukan." }, { status: 404 });
  return NextResponse.json({
    item: { ...data, image_url: supabase.storage.from("archive").getPublicUrl(data.image_path).data.publicUrl },
  });
}
