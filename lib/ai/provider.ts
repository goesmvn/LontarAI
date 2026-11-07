import { callClaude } from "./anthropic";
import { callOpenAI } from "./openai";
import { PROMPT_VERSION } from "./prompt";
import { analysisSchema, postProcess, type AnalysisResult } from "./schema";

export class AiUnavailableError extends Error {}

/** AI_PROVIDER=anthropic (default) | openai */
export async function analyzeManuscript(imageDataUrl: string): Promise<AnalysisResult> {
  const provider = (process.env.AI_PROVIDER || "anthropic").toLowerCase();

  let raw: { text: string; model: string };
  if (provider === "openai") {
    if (!process.env.OPENAI_API_KEY) throw new AiUnavailableError("OPENAI_API_KEY belum diatur.");
    raw = await callOpenAI(imageDataUrl);
  } else {
    if (!process.env.ANTHROPIC_API_KEY) throw new AiUnavailableError("ANTHROPIC_API_KEY belum diatur.");
    raw = await callClaude(imageDataUrl);
  }

  const parsed = analysisSchema.parse(JSON.parse(raw.text));
  return postProcess(parsed, raw.model, PROMPT_VERSION);
}
