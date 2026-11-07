import OpenAI from "openai";
import { SYSTEM_PROMPT } from "./prompt";

let client: OpenAI | null = null;

/** Optional secondary provider (AI_PROVIDER=openai). Returns the raw JSON text. */
export async function callOpenAI(imageDataUrl: string): Promise<{ text: string; model: string }> {
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
  const text = completion.choices[0]?.message?.content;
  if (!text) throw new Error("Respons model kosong.");
  return { text, model };
}
