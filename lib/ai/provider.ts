import OpenAI from "openai";
import { analysisSchema, postProcess, type AnalysisResult } from "./schema";

export const PROMPT_VERSION = "v1";

const SYSTEM_PROMPT = `You are an assistant for philologists working with Balinese palm-leaf manuscripts (lontar) written in Aksara Bali.
You receive a photo of one or more lontar leaves. Ignore labels, stamps, tags, and binding holes; only read the manuscript text.
Tasks:
1. Transcribe each text line into Balinese Unicode (block U+1B00-U+1B7F). Lines are read left block first, then right block when a binding hole splits the text.
2. Give a Latin transliteration for each line.
3. Translate the whole text to formal Indonesian and natural English.
4. Pick one category: usada, wariga, babad, tattwa, kidung, lainnya.
5. Summarise the meaning in at most 2 sentences (Indonesian). Label it as an interpretation, never as authoritative.
STRICT RULES:
- Never invent text. If a glyph or word is unreadable, write [?] in its place and lower that line's confidence.
- Confidence is your honest estimate from 0 to 1 per line; most degraded or ambiguous lines should be below 0.5.
- If no Balinese script is visible, return an empty "lines" array and add a warning.
- For usada (medicine) text, do not give medical advice.
Return ONLY JSON:
{"category":"","lines":[{"index":1,"block":"kiri|kanan|penuh","unicode":"","latin":"","confidence":0.0}],"translation":{"indonesian":"","english":""},"philosophical_context":"","confidence_score":0.0,"warnings":[]}`;

let client: OpenAI | null = null;

export class AiUnavailableError extends Error {}

export async function analyzeManuscript(imageDataUrl: string): Promise<AnalysisResult> {
  if (!process.env.OPENAI_API_KEY) throw new AiUnavailableError("OPENAI_API_KEY belum diatur.");
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 60_000, maxRetries: 1 });
  const model = process.env.LONTAR_AI_MODEL || "gpt-4o";

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: "Analisis lempir lontar pada gambar ini." },
          { type: "image_url", image_url: { url: imageDataUrl, detail: "high" } },
        ],
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("Respons model kosong.");
  const parsed = analysisSchema.parse(JSON.parse(content));
  return postProcess(parsed, model, PROMPT_VERSION);
}
