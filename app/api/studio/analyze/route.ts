import { NextRequest, NextResponse } from "next/server";
import { AiUnavailableError, analyzeManuscript } from "@/lib/ai/provider";
import { explainAiError } from "@/lib/ai/client";
import { clientIp, rateLimit, validateImageDataUrl } from "@/lib/validation";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  if (!rateLimit(`analyze:${clientIp(request.headers)}`, 8, 60_000)) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Coba lagi sebentar lagi." },
      { status: 429 }
    );
  }

  let body: { image?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Format permintaan tidak valid." }, { status: 400 });
  }

  const imageError = validateImageDataUrl(body.image);
  if (imageError) return NextResponse.json({ error: imageError }, { status: 400 });

  try {
    const data = await analyzeManuscript(body.image as string);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    if (e instanceof AiUnavailableError) {
      return NextResponse.json(
        { error: "Layanan AI belum dikonfigurasi. Anda tetap dapat mengisi transkripsi secara manual.", manual: true },
        { status: 503 }
      );
    }
    // Log the cause server-side (never returned to the client).
    console.error("[analyze] gagal:", e instanceof Error ? `${e.name}: ${e.message}` : e);
    if (e instanceof Error && /credit|billing|balance|insufficient|payment|401|403|authentication|unauthor|api key/i.test(e.message)) {
      return NextResponse.json({ error: `${explainAiError(e.message)} Isi transkripsi secara manual, atau hubungi pengelola.`, manual: true }, { status: 503 });
    }
    return NextResponse.json(
      { error: "Gagal menganalisis naskah. Coba lagi atau isi manual.", manual: true },
      { status: 502 }
    );
  }
}
