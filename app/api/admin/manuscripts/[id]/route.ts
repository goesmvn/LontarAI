import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";

const patchSchema = z.object({
  action: z.enum(["verify", "unverify", "takedown"]),
});

/** verify: mark transcription "terverifikasi". takedown: force a public manuscript back to private. */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const a = await requireAdmin(request);
  if ("error" in a) return a.error;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });

  const { data: ms } = await a.db.from("manuscripts").select("id, visibility, leaves(id, image_bucket, image_path)").eq("id", params.id).single();
  if (!ms || ms.visibility !== "public") return NextResponse.json({ error: "Naskah publik tidak ditemukan." }, { status: 404 });

  if (parsed.data.action === "takedown") {
    // Move image archive -> vault so it is no longer publicly reachable, then flip visibility.
    for (const leaf of (ms.leaves ?? []) as { id: string; image_bucket: string; image_path: string }[]) {
      if (leaf.image_bucket !== "archive") continue;
      const { data: blob } = await a.db.storage.from("archive").download(leaf.image_path);
      if (!blob) return NextResponse.json({ error: "Gagal memindahkan gambar." }, { status: 500 });
      const { error: up } = await a.db.storage.from("vault").upload(leaf.image_path, blob, { contentType: "image/jpeg", upsert: true });
      if (up) return NextResponse.json({ error: "Gagal memindahkan gambar." }, { status: 500 });
      await a.db.from("leaves").update({ image_bucket: "vault" }).eq("id", leaf.id);
      await a.db.storage.from("archive").remove([leaf.image_path]);
    }
    await a.db.from("manuscripts").update({
      visibility: "private", consent_public_at: null, public_latitude: null, public_longitude: null,
      show_owner_name: false, updated_at: new Date().toISOString(),
    }).eq("id", params.id);
    await a.db.from("manuscript_reports").update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("manuscript_id", params.id).eq("status", "open");
  } else {
    await a.db.from("leaves").update({ transcription_status: parsed.data.action === "verify" ? "terverifikasi" : "dikoreksi" })
      .eq("manuscript_id", params.id);
  }
  return NextResponse.json({ ok: true });
}
