// Worked examples for the numbered-box reading prompt: lines rendered with Noto Sans Balinese from known
// syllable lists, segmented with our own segmenter, and kept only when the cluster count equals the
// syllable count (so the printed answers align with the boxes).
import { latinToBali } from "./aksara";
import { segmentGlyphs, markedTiles } from "./glyphs";

const CANDIDATES: string[][] = [
  ["sri", "swa", "sti", "a", "stu"],
  ["ka", "la", "ja", "ya", "sa", "ti"],
  ["pu", "ra", "pu", "se", "de", "sa"],
  ["wi", "ja", "ya", "ka", "ma", "la"],
  ["ba", "nga", "ra", "ma", "pa", "da"],
];

function renderLine(latin: string): string {
  const c = document.createElement("canvas"); c.width = 1500; c.height = 150; const x = c.getContext("2d")!;
  x.fillStyle = "#dcc08f"; x.fillRect(0, 0, 1500, 150);
  for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(120,80,30,${(i % 8) * 0.01})`; x.fillRect((i * 97) % 1500, (i * 53) % 150, 60 + (i % 5) * 25, 1); }
  x.filter = "blur(0.6px)"; x.fillStyle = "#3a2714"; x.font = '56px "Noto Sans Balinese"'; x.textBaseline = "middle";
  x.fillText(latinToBali(latin), 30, 75);
  return c.toDataURL("image/png");
}

let cached: { image: string; answers: string[] }[] | null = null;

export async function markedExamples(max = 3): Promise<{ image: string; answers: string[] }[]> {
  if (cached) return cached;
  await document.fonts.load('56px "Noto Sans Balinese"');
  const out: { image: string; answers: string[] }[] = [];
  for (const syl of CANDIDATES) {
    if (out.length >= max) break;
    const line = renderLine(syl.join(""));
    const boxes = await segmentGlyphs(line);
    if (boxes.length !== syl.length) continue; // misaligned: skip
    const [tile] = await markedTiles(line, boxes, 12);
    out.push({ image: tile.image, answers: syl });
  }
  cached = out;
  return out;
}
