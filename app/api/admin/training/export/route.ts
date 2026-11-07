import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

/** JSONL manifest of APPROVED samples with 24h signed image URLs (image, latin, unicode). */
export async function GET(request: NextRequest) {
  const a = await requireAdmin(request);
  if ("error" in a) return a.error;
  const { data, error } = await a.db.from("training_samples").select("id, image_path, latin, unicode, origin, created_at").eq("review", "approved").limit(5000);
  if (error) return NextResponse.json({ error: "Gagal ekspor." }, { status: 500 });
  const lines: string[] = [];
  for (const r of data ?? []) {
    const { data: s } = await a.db.storage.from("training").createSignedUrl(r.image_path, 86400);
    lines.push(JSON.stringify({ id: r.id, image_url: s?.signedUrl, latin: r.latin, unicode: r.unicode, origin: r.origin, schema: "lontarai.line/1" }));
  }
  return new NextResponse(lines.join("\n") + "\n", { headers: { "Content-Type": "application/x-ndjson", "Content-Disposition": 'attachment; filename="lontarai-training.jsonl"' } });
}
