import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { clientIp, rateLimit } from "@/lib/validation";

const schema = z.object({
  slug: z.string().min(8).max(64),
  reason: z.enum(["pingit", "salah_isi", "hak_cipta", "lainnya"]),
  details: z.string().max(1000).optional(),
});

/** Public takedown/content report on a public manuscript. */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Belum dikonfigurasi." }, { status: 503 });
  if (!rateLimit(`report:${clientIp(request.headers)}`, 5, 10 * 60_000)) {
    return NextResponse.json({ error: "Terlalu banyak laporan. Coba lagi nanti." }, { status: 429 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });

  const supabase = getServerSupabase();
  const { data: id } = await supabase.rpc("public_manuscript_id", { p_slug: parsed.data.slug });
  if (!id) return NextResponse.json({ error: "Naskah tidak ditemukan." }, { status: 404 });

  const { error } = await supabase.from("manuscript_reports").insert({
    manuscript_id: id, reason: parsed.data.reason, details: parsed.data.details,
  });
  if (error) return NextResponse.json({ error: "Gagal mengirim laporan." }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
