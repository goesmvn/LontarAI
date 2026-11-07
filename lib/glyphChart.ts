// In-context aids for reading Balinese script with a general vision model (tuned on a printed-text
// benchmark: no chart CER 0.52 -> basic chart 0.18 -> rich chart 0.14 -> rich chart + worked examples 0.12).
// Glyph strings come from our own converter, rendered with Noto Sans Balinese.
import { latinToBali } from "./aksara";

const RICH: string[][] = [
  ["ha", "na", "ca", "ra", "ka", "da", "ta", "sa", "wa", "la", "ma", "ga", "ba", "nga", "pa", "ja", "ya", "nya"],
  ["a", "i", "u", "e", "o", "ĕ", "ā", "ī", "ū", "ai", "au", "ki", "ku", "ke", "ko", "kĕ", "kā", "kai"],
  ["kang", "kar", "kah", "k", "t", "n", "m", "s", "ṭa", "ḍa", "ṇa", "śa", "ṣa", "kṣa", "tha", "dha", "bha", "kha"],
  ["kta", "kya", "kra", "kwa", "sta", "sna", "nda", "mba", "ngka", "ngga", "nca", "nja", "nta", "mpa", "tra", "dya", "bya", "pra"],
];

// Worked examples (different words from anything we benchmark on).
export const EXAMPLE_LINES = ["sri swasti astu", "wiwaha rama sita", "kala jaya sakti mandi", "pura puseh desa adat"];

let cachedChart: string | null = null;
let cachedShots: { image: string; latin: string }[] | null = null;

export async function referenceChart(): Promise<string> {
  if (cachedChart) return cachedChart;
  await document.fonts.load('54px "Noto Sans Balinese"');
  const cw = 100, ch = 120;
  const canvas = document.createElement("canvas");
  canvas.width = cw * 19 + 20; canvas.height = ch * RICH.length + 20;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  RICH.forEach((row, ri) => row.forEach((lab, ci) => {
    ctx.fillStyle = "#111"; ctx.font = '54px "Noto Sans Balinese"'; ctx.textBaseline = "middle";
    ctx.fillText(latinToBali(lab), 10 + ci * cw + cw / 2, 10 + ri * ch + 50);
    ctx.fillStyle = "#a33"; ctx.font = "18px sans-serif";
    ctx.fillText(lab, 10 + ci * cw + cw / 2, 10 + ri * ch + 100);
  }));
  cachedChart = canvas.toDataURL("image/png");
  return cachedChart;
}

export async function exampleShots(): Promise<{ image: string; latin: string }[]> {
  if (cachedShots) return cachedShots;
  await document.fonts.load('56px "Noto Sans Balinese"');
  cachedShots = EXAMPLE_LINES.map((latin) => {
    const c = document.createElement("canvas"); c.width = 1500; c.height = 150;
    const x = c.getContext("2d")!;
    x.fillStyle = "#dcc08f"; x.fillRect(0, 0, 1500, 150); // leaf-like background
    for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(120,80,30,${(i % 8) * 0.01})`; x.fillRect((i * 97) % 1500, (i * 53) % 150, 60 + (i % 5) * 25, 1); }
    x.filter = "blur(0.6px)"; x.fillStyle = "#3a2714"; x.font = '56px "Noto Sans Balinese"'; x.textBaseline = "middle";
    x.fillText(latinToBali(latin), 30, 75);
    return { image: c.toDataURL("image/png"), latin };
  });
  return cachedShots;
}
