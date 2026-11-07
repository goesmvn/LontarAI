import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { bearerToken, getServerSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { clientIp, rateLimit } from "@/lib/validation";

export const dynamic = "force-dynamic";
const fail = (error: string, status: number) => NextResponse.json({ error }, { status });
const JPEG = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/;
const MAX_IMG_BYTES = 400_000;

const sample = z.object({
  line_index: z.number().int().min(0).max(500),
  image: z.string(),
  latin: z.string().trim().min(1).max(500).refine((t) => !t.includes("[?]"), "teks belum lengkap"),
  unicode: z.string().max(1000),
  origin: z.enum(["manual", "ai_corrected"]),
});
const body = z.object({ manuscript_id: z.string().uuid(), samples: z.array(sample).min(1).max(60) });

/** Donate verified line crops + transliterations (opt-in). Pingit manuscripts are refused. */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) return fail("Penyimpanan belum dikonfigurasi.", 503);
  const token = bearerToken(request.headers);
  if (!token) return fail("Masuk terlebih dahulu.", 401);
  if (!rateLimit(`training:${clientIp(request.headers)}`, 20, 10 * 60_000)) return fail("Terlalu banyak permintaan.", 429);
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Data sampel tidak valid (baris dengan [?] tidak dapat disumbangkan).", 400);
  const { manuscript_id, samples } = parsed.data;

  const supabase = getServerSupabase(token);
  const { data: u } = await supabase.auth.getUser(token);
  if (!u.user) return fail("Sesi tidak valid.", 401);
  const { data: ms } = await supabase.from("manuscripts").select("id, is_pingit").eq("id", manuscript_id).maybeSingle();
  if (!ms) return fail("Naskah tidak ditemukan.", 404);
  if (ms.is_pingit) return fail("Naskah pingit tidak dapat disumbangkan sebagai data latih.", 403);

  let saved = 0;
  for (const s of samples) {
    const m = JPEG.exec(s.image);
    if (!m || Math.floor((m[1].length * 3) / 4) > MAX_IMG_BYTES) continue;
    const path = `${u.user.id}/${manuscript_id}/${s.line_index}-${crypto.randomUUID().slice(0, 8)}.jpg`;
    const { error: up } = await supabase.storage.from("training").upload(path, new Blob([Buffer.from(m[1], "base64")], { type: "image/jpeg" }), { contentType: "image/jpeg" });
    if (up) continue;
    const { error } = await supabase.from("training_samples").insert({
      user_id: u.user.id, manuscript_id, line_index: s.line_index, image_path: path, latin: s.latin, unicode: s.unicode, origin: s.origin,
    });
    if (error) { await supabase.storage.from("training").remove([path]); continue; }
    saved++;
  }
  if (saved === 0) return fail("Tidak ada sampel yang dapat disimpan.", 500);
  return NextResponse.json({ saved }, { status: 201 });
}

/** The caller's own donations, grouped by manuscript. */
export async function GET(request: NextRequest) {
  const token = bearerToken(request.headers);
  if (!token) return fail("Masuk terlebih dahulu.", 401);
  const { data, error } = await getServerSupabase(token).from("training_samples").select("manuscript_id, review");
  if (error) return NextResponse.json({ byManuscript: {}, total: 0 });
  const byManuscript: Record<string, number> = {};
  for (const r of data ?? []) if (r.manuscript_id) byManuscript[r.manuscript_id] = (byManuscript[r.manuscript_id] ?? 0) + 1;
  return NextResponse.json({ byManuscript, total: data?.length ?? 0 });
}

/** Withdraw consent: delete the caller's donated samples (optionally for one manuscript) and their images. */
export async function DELETE(request: NextRequest) {
  const token = bearerToken(request.headers);
  if (!token) return fail("Masuk terlebih dahulu.", 401);
  const supabase = getServerSupabase(token);
  const mid = request.nextUrl.searchParams.get("manuscript_id");
  let q = supabase.from("training_samples").select("id, image_path");
  if (mid) q = q.eq("manuscript_id", mid);
  const { data } = await q;
  const rows = data ?? [];
  if (rows.length) {
    await supabase.storage.from("training").remove(rows.map((r) => r.image_path));
    await supabase.from("training_samples").delete().in("id", rows.map((r) => r.id));
  }
  return NextResponse.json({ removed: rows.length });
}
