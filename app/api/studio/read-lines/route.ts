import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { clientIp, rateLimit } from "@/lib/validation";
import { consensus } from "@/lib/ai/consensus";

export const maxDuration = 120;
const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;
const MAX_LINES = 8, MAX_TILES = 24, MAX_SHOTS = 6, RUNS = 2, MAX_BYTES = 1_500_000;

const TAIL =
  "Sekarang baca potongan berikut dengan cara yang sama: cocokkan setiap glif dengan tabel dan contoh, kiri ke kanan, tulis Latin per suku kata. " +
  "Potongan ini hanya SEBAGIAN baris pada lontar (diperbesar); glif di tepi kiri/kanan mungkin terpotong. " +
  "Tandai [?] hanya pada glif yang tidak yakin; jangan menjawab [?] untuk seluruh potongan kecuali tidak ada glif sama sekali yang terlihat. " +
  "Format akhir hanya satu baris: LATIN: ...";

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "Bantuan AI belum dikonfigurasi.", manual: true }, { status: 503 });
  if (!rateLimit(`readlines:${clientIp(request.headers)}`, 4, 60_000)) return NextResponse.json({ error: "Terlalu banyak permintaan. Coba lagi sebentar." }, { status: 429 });

  const body = (await request.json().catch(() => null)) as { chart?: string; shots?: { image: string; latin: string }[]; lines?: string[][] } | null;
  if (!body?.chart || !Array.isArray(body.lines) || body.lines.length === 0 || body.lines.length > MAX_LINES || body.lines.some((l) => !Array.isArray(l) || l.length === 0)) {
    return NextResponse.json({ error: `Kirim 1 sampai ${MAX_LINES} baris, tiap baris berisi ubin gambar.` }, { status: 400 });
  }
  const flat = body.lines.flat();
  if (flat.length > MAX_TILES) return NextResponse.json({ error: `Terlalu banyak ubin (maks ${MAX_TILES}). Pilih area lebih sedikit baris.` }, { status: 400 });
  const shots = Array.isArray(body.shots) ? body.shots.slice(0, MAX_SHOTS) : [];
  if (shots.some((x) => typeof x?.image !== "string" || typeof x?.latin !== "string" || x.latin.length > 120)) {
    return NextResponse.json({ error: "Contoh tidak valid." }, { status: 400 });
  }
  const all = [body.chart, ...shots.map((x) => x.image), ...flat];
  const parsed = all.map((d) => (typeof d === "string" ? DATA_URL.exec(d) : null));
  if (parsed.some((m) => !m) || all.some((d) => d.length > MAX_BYTES * 1.4)) {
    return NextResponse.json({ error: "Gambar tidak valid atau terlalu besar." }, { status: 400 });
  }

  const client = new Anthropic({ timeout: 90_000, maxRetries: 1 });
  const model = process.env.LONTAR_AI_MODEL || "claude-opus-5-5";
  const img = (m: RegExpExecArray): Anthropic.Beta.BetaContentBlockParam => ({
    type: "image", source: { type: "base64", media_type: m[1] as "image/jpeg", data: m[2] },
  });

  const chartImg = parsed[0]!;
  const shotImgs = parsed.slice(1, 1 + shots.length);
  const tiles = parsed.slice(1 + shots.length);
  // Shared prefix (chart + worked examples) is identical for every call: mark it cacheable.
  const prefix: Anthropic.Beta.BetaContentBlockParam[] = [
    { type: "text", text: "Berikut TABEL RUJUKAN aksara Bali (glif dan padanan Latinnya):" }, img(chartImg),
    ...shots.flatMap((sh, k): Anthropic.Beta.BetaContentBlockParam[] => [
      { type: "text", text: `Contoh ${k + 1} (gambar, lalu jawaban yang benar):` }, img(shotImgs[k]!), { type: "text", text: `LATIN: ${sh.latin}` },
    ]),
  ];
  prefix[prefix.length - 1] = { ...(prefix[prefix.length - 1] as Anthropic.Beta.BetaTextBlockParam), cache_control: { type: "ephemeral" } };

  const readOnce = async (tile: RegExpExecArray): Promise<string> => {
    const msg = await client.beta.messages
      .stream({
        model, max_tokens: 1500, output_config: { effort: "low" },
        messages: [{ role: "user", content: [...prefix, { type: "text", text: "Potongan yang harus dibaca:" }, img(tile), { type: "text", text: TAIL }] }],
      })
      .finalMessage();
    return msg.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("");
  };

  let failed = 0, total = 0, lastError = "";
  try {
    // tile results keyed by flat index; then joined per line
    const tileTexts = await Promise.all(
      tiles.map(async (tile) => {
        const runs = await Promise.all(
          Array.from({ length: RUNS }, () => {
            total++;
            return readOnce(tile!).catch((e) => { failed++; lastError = String((e as Error).message).slice(0, 200); console.error("[read-lines] satu pembacaan gagal:", lastError); return ""; });
          }),
        );
        if (process.env.NODE_ENV !== "production") console.log("[read-lines] mentah:", JSON.stringify(runs.map((r) => r.slice(0, 160))));
        return consensus(runs);
      }),
    );
    // If (almost) every call failed, say so instead of pretending the model "could not read" the line.
    if (failed >= total * 0.8) {
      const credit = /credit|billing|balance/i.test(lastError);
      return NextResponse.json({ error: credit ? "Kredit API Anthropic habis atau penagihan bermasalah." : `Pemanggilan AI gagal (${failed}/${total}). ${lastError}`, manual: true }, { status: 502 });
    }
    let k = 0;
    const lines = body.lines.map((tiles) => {
      const parts = tiles.map(() => tileTexts[k++]);
      const text = parts.map((p) => p.text).filter(Boolean).join(" ").replace(/(\[\?\]\s*)+/g, "[?] ").trim();
      const agreement = parts.reduce((s2, p) => s2 + p.agreement, 0) / parts.length;
      // below 15% agreement the reading is mostly noise: leave the line empty for the user
      return { latin: agreement >= 0.15 ? text : "", agreement };
    });
    return NextResponse.json({ lines, model });
  } catch (e) {
    console.error("[read-lines] gagal:", (e as Error).message);
    return NextResponse.json({ error: "Gagal membaca baris. Isi manual atau coba lagi.", manual: true }, { status: 502 });
  }
}
