import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/validation";
import { aiConfigured, explainAiError, isClaudeFamily, providerLabel, type ContentBlock } from "@/lib/ai/client";
import { claudeMessage } from "@/lib/ai/client";

export const maxDuration = 120;
const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;
const MAX_SHEETS = 24, MAX_CELLS = 24, RUNS = 2, MAX_B64 = 2_000_000;

const PROMPT =
  "Gambar 1 adalah TABEL RUJUKAN aksara Bali (glif dan padanan Latinnya). Gambar 2 adalah potongan baris lontar yang diperbesar. Tiap KOTAK BERNOMOR menandai SATU kluster aksara " +
  "(aksara dasar, kadang dengan gantungan/sandhangan menempel); nomor ada di atas kotak, dari kiri ke kanan. Baca potongan secara utuh (konteks kata membantu), lalu untuk SETIAP nomor " +
  "tulis bacaan suku kata Latin sebagai kandidat berurutan dari yang paling yakin, dipisah '/', maksimal 3 (contoh: 'ka/ga'). Pakai ejaan tabel: ka ki ku ke ko kĕ kā, ng r h, gugus seperti sta ngka kya. " +
  "Konsonan mati (adeg-adeg) tulis konsonannya saja (mis. 't'). Jika kotak bukan aksara (noda, lubang) tulis '-'. Jika tidak yakin sama sekali tulis '?'. " +
  "Format: satu baris per nomor, 'N: kandidat'. Tanpa penjelasan.";

function parse(text: string, count: number): string[][] {
  const out: string[][] = Array.from({ length: count }, () => []);
  for (const line of text.split("\n")) {
    const m = /^\s*(\d{1,2})\s*[:.)-]\s*(.+?)\s*$/.exec(line);
    if (!m) continue;
    const idx = Number(m[1]) - 1;
    if (idx < 0 || idx >= count) continue;
    out[idx] = m[2].split("/").map((s) => s.trim().replace(/[\s"'`*]/g, "")).filter(Boolean).slice(0, 3);
  }
  return out;
}

export async function POST(request: NextRequest) {
  if (!aiConfigured()) return NextResponse.json({ error: "Bantuan AI belum dikonfigurasi.", manual: true }, { status: 503 });
  if (!isClaudeFamily()) return NextResponse.json({ error: `Pembacaan karakter belum didukung untuk penyedia ${providerLabel()}. Gunakan AI_PROVIDER=anthropic atau opencode.`, manual: true }, { status: 503 });
  if (!rateLimit(`readglyphs:${clientIp(request.headers)}`, 6, 60_000)) return NextResponse.json({ error: "Terlalu banyak permintaan. Coba lagi sebentar." }, { status: 429 });

  const body = (await request.json().catch(() => null)) as { chart?: string; shots?: { image: string; answers: string[] }[]; sheets?: { image: string; count: number }[] } | null;
  if (!body?.chart || !Array.isArray(body.sheets) || body.sheets.length === 0 || body.sheets.length > MAX_SHEETS ||
      body.sheets.some((s) => typeof s.image !== "string" || !Number.isInteger(s.count) || s.count < 1 || s.count > MAX_CELLS)) {
    return NextResponse.json({ error: `Kirim 1 sampai ${MAX_SHEETS} lembar sel.` }, { status: 400 });
  }
  const chart = DATA_URL.exec(body.chart);
  const sheets = body.sheets.map((s) => DATA_URL.exec(s.image));
  if (!chart || sheets.some((m) => !m) || body.chart.length > MAX_B64 || body.sheets.some((s) => s.image.length > MAX_B64)) {
    return NextResponse.json({ error: "Gambar tidak valid atau terlalu besar." }, { status: 400 });
  }

  const img = (m: RegExpExecArray, extra: ContentBlock = {}): ContentBlock => ({ type: "image", source: { type: "base64", media_type: m[1], data: m[2] }, ...extra });
  // Shared prefix (chart + worked examples) is identical for every call: mark it cacheable.
  const shots = (Array.isArray(body.shots) ? body.shots.slice(0, 4) : []).filter((x) => typeof x?.image === "string" && Array.isArray(x.answers) && x.answers.length <= MAX_CELLS);
  const shotImgs = shots.map((x) => DATA_URL.exec(x.image));
  if (shotImgs.some((m) => !m)) return NextResponse.json({ error: "Contoh tidak valid." }, { status: 400 });
  const prefix: ContentBlock[] = [
    { type: "text", text: "Gambar 1 (TABEL RUJUKAN):" },
    img(chart),
    ...shots.flatMap((x, k): ContentBlock[] => [
      { type: "text", text: `Contoh ${k + 1} (potongan bernomor, lalu jawaban yang benar):` },
      img(shotImgs[k]!),
      { type: "text", text: x.answers.map((a, i) => `${i + 1}: ${String(a).slice(0, 24)}`).join("\n") },
    ]),
  ];
  prefix[prefix.length - 1] = { ...prefix[prefix.length - 1], cache_control: { type: "ephemeral" } };

  let failed = 0, total = 0, lastError = "";
  const readOnce = async (sheet: RegExpExecArray, count: number): Promise<string[][]> => {
    total++;
    try {
      const { text } = await claudeMessage({
        maxTokens: 1500, effort: "low", timeoutMs: 90_000,
        content: [...prefix, { type: "text", text: `Potongan yang harus dibaca (${count} kotak):` }, img(sheet), { type: "text", text: PROMPT }],
      });
      if (process.env.NODE_ENV !== "production") console.log("[read-glyphs] mentah:", JSON.stringify(text.slice(0, 260)));
      return parse(text, count);
    } catch (e) {
      failed++; lastError = String((e as Error).message).slice(0, 300); console.error("[read-glyphs] gagal:", lastError);
      return Array.from({ length: count }, () => []);
    }
  };

  const results = await Promise.all(body.sheets.map(async (s, i) => {
    const runs = await Promise.all(Array.from({ length: RUNS }, () => readOnce(sheets[i]!, s.count)));
    // merge candidate rankings across runs (Borda-style)
    return Array.from({ length: s.count }, (_, c) => {
      const score = new Map<string, number>();
      runs.forEach((r) => (r[c] ?? []).forEach((cand, rank) => score.set(cand, (score.get(cand) ?? 0) + (3 - rank))));
      return Array.from(score.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([cand, sc]) => ({ cand, score: sc, runs: runs.filter((r) => (r[c] ?? []).includes(cand)).length }));
    });
  }));

  if (failed >= total * 0.8) {
    return NextResponse.json({ error: `${explainAiError(lastError)} (${failed}/${total} panggilan gagal)`, manual: true }, { status: 502 });
  }
  return NextResponse.json({ sheets: results, runs: RUNS, provider: providerLabel() });
}
