import { z } from "zod";

export const CATEGORIES = ["usada", "wariga", "babad", "tattwa", "kidung", "lainnya"] as const;
export type Category = (typeof CATEGORIES)[number];

const lineSchema = z.object({
  index: z.number().int().default(1),
  block: z.enum(["kiri", "kanan", "penuh"]).default("penuh"),
  unicode: z.string().default(""),
  latin: z.string().default(""),
  confidence: z.number().min(0).max(1).default(0.3),
});

export const analysisSchema = z.object({
  category: z.enum(CATEGORIES).catch("lainnya"),
  lines: z.array(lineSchema).default([]),
  translation: z
    .object({ indonesian: z.string().default(""), english: z.string().default("") })
    .default({ indonesian: "", english: "" }),
  philosophical_context: z.string().default(""),
  confidence_score: z.number().min(0).max(1).default(0.3),
  warnings: z.array(z.string()).default([]),
});

export type RawAnalysis = z.infer<typeof analysisSchema>;

export type AnalysisResult = RawAnalysis & {
  unicode_transcription: string;
  latin_transliteration: string;
  model: string;
  prompt_version: string;
  status: "draf_ai";
};

// Balinese Unicode block U+1B00–U+1B7F
const BALI_BLOCK = /[ᬀ-᭿]/;
const ALLOWED_OTHER = /[\s -/:-@\[\]?|.,]/;

// A line with no real glyph content: only [?], punctuation, or whitespace.
const isJunk = (s: string) => s.replace(/\[\?\]|[\s\u1B5A-\u1B5F.,;:|()\-]/g, "") === "";

export function postProcess(raw: RawAnalysis, model: string, promptVersion: string): AnalysisResult {
  const warnings = [...raw.warnings];
  let cleared = 0;
  const lines = raw.lines.map((l) => {
    const unicode = l.unicode.normalize("NFC");
    if (isJunk(unicode) && isJunk(l.latin)) {
      cleared++;
      return { ...l, unicode: "", latin: "", confidence: 0 };
    }
    return { ...l, unicode };
  });
  if (cleared > 0 && cleared === lines.length) {
    warnings.push("AI tidak dapat membaca aksara pada foto ini. Layout terdeteksi; isi transkripsi secara manual.");
  }

  const stray = lines.some((l) =>
    Array.from(l.unicode).some((ch) => !BALI_BLOCK.test(ch) && !ALLOWED_OTHER.test(ch))
  );
  if (stray) warnings.push("Ada karakter di luar blok aksara Bali; periksa transkripsi.");
  if (lines.length === 0) warnings.push("Tidak ada baris teks yang terdeteksi.");

  return {
    ...raw,
    lines,
    warnings,
    unicode_transcription: lines.map((l) => l.unicode).join("\n"),
    latin_transliteration: lines.map((l) => l.latin).join("\n"),
    model,
    prompt_version: promptVersion,
    status: "draf_ai",
  };
}
