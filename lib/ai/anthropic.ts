import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "./prompt";

let client: Anthropic | null = null;

const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/;

/** Primary provider: Claude vision. Returns the raw JSON text. */
export async function callClaude(imageDataUrl: string): Promise<{ text: string; model: string }> {
  const m = DATA_URL.exec(imageDataUrl);
  if (!m) throw new Error("Format gambar tidak didukung.");
  const mediaType = m[1] as "image/jpeg" | "image/png" | "image/webp";

  client ??= new Anthropic({ timeout: 120_000, maxRetries: 1 }); // reads ANTHROPIC_API_KEY
  const model = process.env.LONTAR_AI_MODEL || "claude-opus-5-5";

  // Streaming avoids HTTP timeouts on long reasoning/output; thinking is always on for this model,
  // so only effort is tuned. Fallbacks re-run the request on a server-chosen model if a
  // safety classifier declines it.
  const message = await client.beta.messages
    .stream({
      model,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "high" },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: m[2] } },
            { type: "text", text: "Analisis lempir lontar pada gambar ini. Balas hanya dengan JSON." },
          ],
        },
      ],
    })
    .finalMessage();

  if (message.stop_reason === "refusal") throw new Error("Model menolak permintaan.");
  if (message.stop_reason === "max_tokens") throw new Error("Respons terpotong.");

  const text = message.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Respons model tidak berisi JSON.");
  return { text: text.slice(start, end + 1), model: message.model ?? model };
}
