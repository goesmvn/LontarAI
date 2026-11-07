import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";

const schema = z.object({ review: z.enum(["approved", "rejected"]), latin: z.string().trim().min(1).max(500).optional(), unicode: z.string().max(1000).optional() });

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const a = await requireAdmin(request);
  if ("error" in a) return a.error;
  const p = schema.safeParse(await request.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  const { error } = await a.db.from("training_samples").update({ ...p.data, reviewed_at: new Date().toISOString() }).eq("id", params.id);
  if (error) return NextResponse.json({ error: "Gagal memperbarui." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
