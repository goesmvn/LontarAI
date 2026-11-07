import { SYSTEM_PROMPT } from "./prompt";
import { claudeMessage } from "./client";

const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/;

/** Claude vision (direct Anthropic or through OpenCode). Returns the raw JSON text. */
export async function callClaude(imageDataUrl: string): Promise<{ text: string; model: string }> {
  const m = DATA_URL.exec(imageDataUrl);
  if (!m) throw new Error("Format gambar tidak didukung.");

  const { text: full, model, stopReason } = await claudeMessage({
    system: SYSTEM_PROMPT,
    maxTokens: 16000, effort: "high", fallbacks: true, timeoutMs: 120_000,
    content: [
      { type: "image", source: { type: "base64", media_type: m[1], data: m[2] } },
      { type: "text", text: "Analisis lempir lontar pada gambar ini. Balas hanya dengan JSON." },
    ],
  });
  if (stopReason === "refusal") throw new Error("Model menolak permintaan.");
  if (stopReason === "max_tokens") throw new Error("Respons terpotong.");
  const start = full.indexOf("{");
  const end = full.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Respons model tidak berisi JSON.");
  return { text: full.slice(start, end + 1), model };
}
