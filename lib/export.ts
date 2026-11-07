import type { AnalysisResult } from "./ai/schema";

export type ExportMeta = {
  title?: string; owner?: string; regency?: string; village_banjar?: string; era?: string;
  source?: string;
};

/** Structured JSON export. Never includes precise coordinates. */
export function buildExport(meta: ExportMeta, a: AnalysisResult, edited: boolean) {
  return {
    schema: "lontarai.leaf/1",
    exported_at: new Date().toISOString(),
    metadata: meta,
    transcription_status: edited ? "dikoreksi" : "draf_ai",
    category: a.category,
    unicode_transcription: a.unicode_transcription,
    latin_transliteration: a.latin_transliteration,
    lines: a.lines,
    translation: a.translation,
    philosophical_context: a.philosophical_context,
    confidence_score: a.confidence_score,
    warnings: a.warnings,
    model: a.model,
    prompt_version: a.prompt_version,
    disclaimer: "Draf AI. Bukan tafsir otoritatif; perlu verifikasi pembaca aksara Bali.",
  };
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
