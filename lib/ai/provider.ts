import { callClaude } from "./anthropic";
import { aiConfigured, aiKeyName, provider } from "./client";
import { callOpenAI } from "./openai";
import { PROMPT_VERSION } from "./prompt";
import { analysisSchema, postProcess, type AnalysisResult } from "./schema";

export class AiUnavailableError extends Error {}

/** AI_PROVIDER=anthropic (default) | opencode | openai. See lib/ai/client.ts. */
export async function analyzeManuscript(imageDataUrl: string): Promise<AnalysisResult> {
  if (!aiConfigured()) throw new AiUnavailableError(`${aiKeyName()} belum diatur.`);
  const raw = provider() === "openai" ? await callOpenAI(imageDataUrl) : await callClaude(imageDataUrl);

  const parsed = analysisSchema.parse(JSON.parse(raw.text));
  return postProcess(parsed, raw.model, PROMPT_VERSION);
}
