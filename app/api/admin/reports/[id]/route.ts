import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const a = await requireAdmin(request);
  if ("error" in a) return a.error;
  const parsed = z.object({ status: z.enum(["resolved", "dismissed"]) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  const { error } = await a.db.from("manuscript_reports")
    .update({ status: parsed.data.status, resolved_at: new Date().toISOString() }).eq("id", params.id);
  if (error) return NextResponse.json({ error: "Gagal memperbarui laporan." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
