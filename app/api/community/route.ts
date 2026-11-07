import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { bearerToken, getServerSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { clientIp, rateLimit } from "@/lib/validation";

export const dynamic = "force-dynamic";
const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ posts: [], configured: false });
  const { data, error } = await getServerSupabase()
    .from("community_posts").select("id, user_id, author_name, body, created_at").order("created_at", { ascending: false }).limit(50);
  if (error) return NextResponse.json({ posts: [], error: "Tabel komunitas belum dibuat. Jalankan bagian terbaru supabase/schema.sql." });
  return NextResponse.json({ posts: data ?? [] });
}

const schema = z.object({ body: z.string().trim().min(1).max(2000), author_name: z.string().trim().min(1).max(80) });

export async function POST(request: NextRequest) {
  const token = bearerToken(request.headers);
  if (!token) return fail("Masuk terlebih dahulu.", 401);
  if (!rateLimit(`post:${clientIp(request.headers)}`, 10, 10 * 60_000)) return fail("Terlalu banyak kiriman. Coba lagi nanti.", 429);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Isi catatan (maks 2000 karakter) dan nama tampilan diperlukan.", 400);
  const supabase = getServerSupabase(token);
  const { data: u } = await supabase.auth.getUser(token);
  if (!u.user) return fail("Sesi tidak valid.", 401);
  const { error } = await supabase.from("community_posts").insert({ user_id: u.user.id, ...parsed.data });
  if (error) return fail("Gagal mengirim catatan.", 500);
  return NextResponse.json({ ok: true });
}
