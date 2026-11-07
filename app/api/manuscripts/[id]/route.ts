import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { bearerToken, getServerSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { blurCoordinate } from "@/lib/geo";

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

const patchSchema = z.object({
  visibility: z.enum(["private", "public"]),
  consent_public: z.boolean().optional(),
  show_owner_name: z.boolean().optional(),
});

function auth(request: NextRequest) {
  if (!isSupabaseConfigured()) return { error: fail("Penyimpanan belum dikonfigurasi.", 503) };
  const token = bearerToken(request.headers);
  if (!token) return { error: fail("Masuk terlebih dahulu.", 401) };
  return { token, supabase: getServerSupabase(token) };
}

/** Change visibility (publish with consent, or revoke). Moves the image between buckets. */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const a = auth(request);
  if ("error" in a) return a.error;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Permintaan tidak valid.", 400);
  const { visibility, consent_public, show_owner_name } = parsed.data;

  const { data: ms } = await a.supabase
    .from("manuscripts")
    .select("id, latitude, longitude, is_pingit, visibility, leaves(id, image_bucket, image_path)")
    .eq("id", params.id)
    .single();
  if (!ms) return fail("Naskah tidak ditemukan.", 404);
  if (visibility === "public" && ms.is_pingit) return fail("Naskah pingit tidak dapat dipublikasikan.", 400);
  if (visibility === "public" && !consent_public) return fail("Persetujuan publikasi diperlukan.", 400);
  if (ms.visibility === visibility) return NextResponse.json({ ok: true });

  const from = visibility === "public" ? "vault" : "archive";
  const to = visibility === "public" ? "archive" : "vault";
  const leaves = (ms.leaves ?? []) as { id: string; image_bucket: string; image_path: string }[];

  for (const leaf of leaves) {
    if (leaf.image_bucket !== from) continue;
    const { data: blob, error: dl } = await a.supabase.storage.from(from).download(leaf.image_path);
    if (dl || !blob) return fail("Gagal memindahkan gambar.", 500);
    const { error: up } = await a.supabase.storage.from(to).upload(leaf.image_path, blob, { contentType: "image/jpeg", upsert: true });
    if (up) return fail("Gagal memindahkan gambar.", 500);
    await a.supabase.from("leaves").update({ image_bucket: to }).eq("id", leaf.id);
    await a.supabase.storage.from(from).remove([leaf.image_path]);
  }

  const { error } = await a.supabase.from("manuscripts").update(
    visibility === "public"
      ? {
          visibility, consent_public_at: new Date().toISOString(),
          public_latitude: blurCoordinate(ms.latitude), public_longitude: blurCoordinate(ms.longitude),
          show_owner_name: !!show_owner_name, updated_at: new Date().toISOString(),
        }
      : { visibility, consent_public_at: null, public_latitude: null, public_longitude: null, show_owner_name: false, updated_at: new Date().toISOString() }
  ).eq("id", params.id);
  if (error) return fail("Gagal memperbarui visibilitas.", 500);
  return NextResponse.json({ ok: true });
}

/** Permanently delete the manuscript and its image files. */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const a = auth(request);
  if ("error" in a) return a.error;
  const { data: ms } = await a.supabase.from("manuscripts").select("id, leaves(image_bucket, image_path)").eq("id", params.id).single();
  if (!ms) return fail("Naskah tidak ditemukan.", 404);
  for (const leaf of (ms.leaves ?? []) as { image_bucket: string; image_path: string }[]) {
    await a.supabase.storage.from(leaf.image_bucket).remove([leaf.image_path]);
  }
  const { error } = await a.supabase.from("manuscripts").delete().eq("id", params.id);
  if (error) return fail("Gagal menghapus.", 500);
  return NextResponse.json({ ok: true });
}
