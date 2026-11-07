import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { clientIp, rateLimit } from "@/lib/validation";
import { consensus } from "@/lib/ai/consensus";

export const maxDuration = 120;
const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;
const MAX_LINES = 8, RUNS = 3, MAX_BYTES = 1_500_000;

const PROMPT =
  "Gambar 1 adalah TABEL RUJUKAN aksara Bali (glif dan padanan Latinnya). Gambar 2 berisi SATU baris aksara Bali pada lontar. " +
  "Jangan menebak kata atau kalimat dari ingatan: cocokkan setiap glif pada Gambar 2 dengan tabel rujukan, urut dari kiri ke kanan, " +
  "lalu tulis transliterasi Latin per suku kata. Beri tanda [?] untuk glif yang tidak dapat dicocokkan dengan yakin. " +
  "Jika gambar terlalu kecil atau kabur untuk dibaca, balas persis: LATIN: [?]. Format akhir hanya satu baris: LATIN: ...";

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "Bantuan AI belum dikonfigurasi.", manual: true }, { status: 503 });
  if (!rateLimit(`readlines:${clientIp(request.headers)}`, 4, 60_000)) return NextResponse.json({ error: "Terlalu banyak permintaan. Coba lagi sebentar." }, { status: 429 });

  const body = (await request.json().catch(() => null)) as { chart?: string; lines?: string[] } | null;
  if (!body?.chart || !Array.isArray(body.lines) || body.lines.length === 0 || body.lines.length > MAX_LINES) {
    return NextResponse.json({ error: `Kirim 1 sampai ${MAX_LINES} potongan baris.` }, { status: 400 });
  }
  const all = [body.chart, ...body.lines];
  const parsed = all.map((d) => (typeof d === "string" ? DATA_URL.exec(d) : null));
  if (parsed.some((m) => !m) || all.some((d) => d.length > MAX_BYTES * 1.4)) {
    return NextResponse.json({ error: "Gambar tidak valid atau terlalu besar." }, { status: 400 });
  }

  const client = new Anthropic({ timeout: 90_000, maxRetries: 1 });
  const model = process.env.LONTAR_AI_MODEL || "claude-opus-5-5";
  const img = (m: RegExpExecArray): Anthropic.Beta.BetaContentBlockParam => ({
    type: "image", source: { type: "base64", media_type: m[1] as "image/jpeg", data: m[2] },
  });

  const readOnce = async (line: RegExpExecArray): Promise<string> => {
    const msg = await client.beta.messages
      .stream({
        model, max_tokens: 1500, output_config: { effort: "low" },
        messages: [{ role: "user", content: [
          { type: "text", text: "Gambar 1:" }, img(parsed[0]!),
          { type: "text", text: "Gambar 2:" }, img(line),
          { type: "text", text: PROMPT },
        ] }],
      })
      .finalMessage();
    return msg.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("");
  };

  try {
    const results = await Promise.all(
      parsed.slice(1).map(async (line) => {
        const runs = await Promise.all(Array.from({ length: RUNS }, () => readOnce(line!).catch(() => "")));
        return consensus(runs);
      }),
    );
    // below 30% agreement the reading is mostly noise: leave the line empty for the user
    return NextResponse.json({ lines: results.map((r) => ({ latin: r.agreement >= 0.3 ? r.text : "", agreement: r.agreement })), model });
  } catch (e) {
    console.error("[read-lines] gagal:", (e as Error).message);
    return NextResponse.json({ error: "Gagal membaca baris. Isi manual atau coba lagi.", manual: true }, { status: 502 });
  }
}
