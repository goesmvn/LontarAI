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

export function postProcess(raw: RawAnalysis, model: string, promptVersion: string): AnalysisResult {
  const warnings = [...raw.warnings];
  const lines = raw.lines.map((l) => ({ ...l, unicode: l.unicode.normalize("NFC") }));

  const stray = lines.some((l) =>
    Array.from(l.unicode).some((ch) => !BALI_BLOCK.test(ch) && !ALLOWED_OTHER.test(ch))
  );
  if (stray) warnings.push("Ada karakter di luar blok aksara Bali; periksa transkripsi.");
  if (lines.length === 0) warnings.push("Tidak ada baris teks yang terdeteksi.");
  if (lines.length > 0 && !lines.some((l) => BALI_BLOCK.test(l.unicode))) {
    warnings.push("Tidak ada aksara Bali pada hasil transkripsi.");
  }

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
