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

let cachedChart: string | null = null;

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
