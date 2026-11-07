import { NextRequest, NextResponse } from "next/server";
import { bearerToken, getServerSupabase } from "@/lib/supabase";

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const token = bearerToken(request.headers);
  if (!token) return NextResponse.json({ error: "Masuk terlebih dahulu." }, { status: 401 });
  const { error } = await getServerSupabase(token).from("community_posts").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: "Gagal menghapus." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
