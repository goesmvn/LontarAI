import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { bearerToken, getServerSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { blurCoordinate } from "@/lib/geo";
import { CATEGORIES } from "@/lib/ai/schema";
import { clientIp, rateLimit, validateBaliCoordinates, validateImageDataUrl } from "@/lib/validation";

const bodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  category: z.enum(CATEGORIES),
  owner_name: z.string().trim().min(1).max(200),
  affiliation: z.string().max(100).optional(),
  custodian_notes: z.string().max(1000).optional(),
  estimated_creation_era: z.string().max(100).optional(),
  physical_condition: z.enum(["baik", "rapuh", "rusak_sebagian", "fragmentaris"]).optional(),
  regency: z.string().trim().min(1).max(100),
  village_banjar: z.string().trim().min(1).max(150),
  latitude: z.number(),
  longitude: z.number(),
  visibility: z.enum(["private", "public"]),
  is_pingit: z.boolean().default(false),
  consent_public: z.boolean().default(false),
  show_owner_name: z.boolean().default(false),
  image: z.string(),
  folio_label: z.string().max(20).optional(),
  analysis: z.object({
    unicode_transcription: z.string().max(20000),
    latin_transliteration: z.string().max(20000),
    translation: z.object({ indonesian: z.string().max(20000), english: z.string().max(20000) }),
    philosophical_context: z.string().max(2000),
    confidence_score: z.number().min(0).max(1),
    status: z.enum(["draf_ai", "dikoreksi", "terverifikasi"]),
    lines: z.array(z.unknown()).max(200),
    model: z.string().max(100).optional(),
    prompt_version: z.string().max(20).optional(),
  }),
});

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) return fail("Penyimpanan belum dikonfigurasi.", 503);
  const token = bearerToken(request.headers);
  if (!token) return fail("Masuk terlebih dahulu untuk menyimpan naskah.", 401);
  if (!rateLimit(`save:${clientIp(request.headers)}`, 60, 10 * 60_000)) {
    return fail("Terlalu banyak penyimpanan. Coba lagi nanti.", 429);
  }

  let parsed;
  try {
    parsed = bodySchema.safeParse(await request.json());
  } catch {
    return fail("Format permintaan tidak valid.", 400);
  }
  if (!parsed.success) return fail("Data belum lengkap atau tidak valid.", 400);
  const b = parsed.data;

  const err = validateImageDataUrl(b.image) ?? validateBaliCoordinates(b.latitude, b.longitude);
  if (err) return fail(err, 400);

  // Privacy rules (also enforced by DB constraints)
  const makePublic = b.visibility === "public";
  if (makePublic && b.is_pingit) return fail("Naskah pingit tidak dapat dipublikasikan.", 400);
  if (makePublic && !b.consent_public) return fail("Persetujuan publikasi diperlukan.", 400);

  const supabase = getServerSupabase(token);
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return fail("Sesi tidak valid. Silakan masuk lagi.", 401);
  const userId = userData.user.id;

  const bucket = makePublic ? "archive" : "vault";
  const path = `${userId}/${crypto.randomUUID()}.jpg`;
  const blob = new Blob([Buffer.from(b.image.split(",")[1], "base64")], { type: "image/jpeg" });

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, blob, { contentType: "image/jpeg" });
  if (uploadError) return fail("Gagal menyimpan gambar.", 500);

  const { data: ms, error: msError } = await supabase
    .from("manuscripts")
    .insert({
      user_id: userId,
      title: b.title,
      category: b.category,
      owner_name: b.owner_name,
      affiliation: b.affiliation,
      custodian_notes: b.custodian_notes,
      estimated_creation_era: b.estimated_creation_era,
      physical_condition: b.physical_condition,
      regency: b.regency,
      village_banjar: b.village_banjar,
      latitude: b.latitude,
      longitude: b.longitude,
      public_latitude: makePublic ? blurCoordinate(b.latitude) : null,
      public_longitude: makePublic ? blurCoordinate(b.longitude) : null,
      visibility: b.visibility,
      is_pingit: b.is_pingit,
      consent_public_at: makePublic ? new Date().toISOString() : null,
      show_owner_name: makePublic && b.show_owner_name,
    })
    .select("id, slug")
    .single();

  if (msError || !ms) {
    await supabase.storage.from(bucket).remove([path]);
    return fail("Gagal menyimpan naskah.", 500);
  }

  const a = b.analysis;
  const { error: leafError } = await supabase.from("leaves").insert({
    manuscript_id: ms.id,
    folio_label: b.folio_label,
    image_bucket: bucket,
    image_path: path,
    transcription_status: a.status,
    unicode_transcription: a.unicode_transcription,
    latin_transliteration: a.latin_transliteration,
    translation_id: a.translation.indonesian,
    translation_en: a.translation.english,
    philosophical_context: a.philosophical_context,
    lines: a.lines,
    confidence_score: a.confidence_score,
    model_name: a.model,
    prompt_version: a.prompt_version,
  });
  if (leafError) {
    await supabase.from("manuscripts").delete().eq("id", ms.id);
    await supabase.storage.from(bucket).remove([path]);
    return fail("Gagal menyimpan transkripsi.", 500);
  }

  return NextResponse.json({ id: ms.id, slug: ms.slug, visibility: b.visibility }, { status: 201 });
}

/** The caller's own manuscripts (private + public), with signed image URLs. */
export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) return fail("Penyimpanan belum dikonfigurasi.", 503);
  const token = bearerToken(request.headers);
  if (!token) return fail("Masuk terlebih dahulu.", 401);

  const supabase = getServerSupabase(token);
  const { data, error } = await supabase
    .from("manuscripts")
    .select("id, slug, title, category, visibility, is_pingit, regency, village_banjar, created_at, leaves(image_bucket, image_path, latin_transliteration, translation_id, transcription_status)")
    .order("created_at", { ascending: false });
  if (error) return fail("Gagal memuat naskah.", 500);

  const items = await Promise.all(
    (data ?? []).map(async (m) => {
      const leaf = Array.isArray(m.leaves) ? m.leaves[0] : null;
      let image_url: string | null = null;
      if (leaf) {
        if (leaf.image_bucket === "archive") {
          image_url = supabase.storage.from("archive").getPublicUrl(leaf.image_path).data.publicUrl;
        } else {
          const { data: signed } = await supabase.storage.from("vault").createSignedUrl(leaf.image_path, 600);
          image_url = signed?.signedUrl ?? null;
        }
      }
      return { ...m, leaves: undefined, leaf, image_url };
    })
  );
  return NextResponse.json({ manuscripts: items });
}
