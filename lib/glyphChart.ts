// Reference chart of Balinese glyphs rendered with Noto Sans Balinese. Sent to the model together
// with each line crop so it can MATCH glyphs instead of guessing from memory (tested: this cuts
// hallucination; see docs/REFERENSI.md notes). Glyph strings come from our own converter.
import { latinToBali } from "./aksara";

const ROWS: string[][] = [
  ["ha", "na", "ca", "ra", "ka", "da", "ta", "sa", "wa", "la", "ma", "ga", "ba", "nga", "pa", "ja", "ya", "nya"],
  ["a", "i", "u", "e", "o", "ka", "kā", "ki", "kī", "ku", "kū", "ke", "ko", "kĕ", "kai", "kau", "kang", "kar", "kah"],
  ["ngka", "ngga", "nca", "nja", "nta", "nda", "mpa", "mba", "sta", "sna", "kya", "kra", "kwa", "bhu", "dha", "tha", "kṣa", "śa"],
];

let cached: string | null = null;

export async function referenceChart(): Promise<string> {
  if (cached) return cached;
  await document.fonts.load('54px "Noto Sans Balinese"');
  const cw = 100, ch = 120;
  const canvas = document.createElement("canvas");
  canvas.width = cw * 19 + 20; canvas.height = ch * ROWS.length + 20;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ROWS.forEach((row, ri) => row.forEach((lab, ci) => {
    ctx.fillStyle = "#111"; ctx.font = '54px "Noto Sans Balinese"'; ctx.textBaseline = "middle";
    ctx.fillText(latinToBali(lab), 10 + ci * cw + cw / 2, 10 + ri * ch + 50);
    ctx.fillStyle = "#a33"; ctx.font = "18px sans-serif";
    ctx.fillText(lab, 10 + ci * cw + cw / 2, 10 + ri * ch + 100);
  }));
  cached = canvas.toDataURL("image/png");
  return cached;
}
