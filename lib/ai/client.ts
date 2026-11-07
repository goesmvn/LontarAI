// One place that decides WHICH model service is used (server only).
//   AI_PROVIDER=anthropic (default)  Anthropic API directly            -> ANTHROPIC_API_KEY
//   AI_PROVIDER=opencode             OpenCode Console, Anthropic-compatible gateway -> OPENCODE_API_KEY
//   AI_PROVIDER=openai               OpenAI (analysis only)             -> OPENAI_API_KEY
// OpenCode Console (https://opencode.ai/docs/zen) serves Claude models at
// https://opencode.ai/inference/anthropic (override with OPENCODE_BASE_URL). Its free-tier models can only be used
// from the OpenCode app itself, so the app needs paid credits or an OpenCode Go plan.
import Anthropic from "@anthropic-ai/sdk";

export type Provider = "anthropic" | "opencode" | "openai";

export const provider = (): Provider => {
  const p = (process.env.AI_PROVIDER || "anthropic").toLowerCase();
  return p === "opencode" || p === "openai" ? p : "anthropic";
};

export const providerLabel = () => ({ anthropic: "Anthropic", opencode: "OpenCode", openai: "OpenAI" })[provider()];

export function aiKey(): string | undefined {
  const p = provider();
  return p === "opencode" ? process.env.OPENCODE_API_KEY : p === "openai" ? process.env.OPENAI_API_KEY : process.env.ANTHROPIC_API_KEY;
}
export const aiKeyName = () => ({ anthropic: "ANTHROPIC_API_KEY", opencode: "OPENCODE_API_KEY", openai: "OPENAI_API_KEY" })[provider()];
export const aiConfigured = () => !!aiKey();

/** Models: LONTAR_AI_MODEL wins. Defaults to claude-opus-5-5 for Anthropic/OpenCode and gpt-4o for OpenAI. */
export const aiModel = () => process.env.LONTAR_AI_MODEL || (provider() === "openai" ? "gpt-4o" : "claude-opus-5-5");

/** True when the provider speaks the Anthropic Messages API (direct or through OpenCode). */
export const isClaudeFamily = () => provider() !== "openai";

let cached: { key: string; base: string | undefined; timeout: number; client: Anthropic } | null = null;

export function claudeClient(timeoutMs = 90_000): Anthropic {
  const key = aiKey();
  if (!key) throw new Error(`${aiKeyName()} belum diatur.`);
  const base = provider() === "opencode" ? process.env.OPENCODE_BASE_URL || "https://opencode.ai/inference/anthropic" : undefined;
  if (cached && cached.key === key && cached.base === base && cached.timeout === timeoutMs) return cached.client;
  // OpenCode documents Bearer auth; send the key both ways so either style of gateway accepts it.
  const client = new Anthropic(base ? { apiKey: key, authToken: key, baseURL: base, timeout: timeoutMs, maxRetries: 1 } : { apiKey: key, timeout: timeoutMs, maxRetries: 1 });
  cached = { key, base, timeout: timeoutMs, client };
  return client;
}

export type ContentBlock = Record<string, unknown>;

/**
 * Single text-out call. Direct Anthropic uses beta features (effort control, server-side fallbacks).
 * Gateways get the plain Messages API only, since beta fields may not be forwarded.
 */
export async function claudeMessage(opts: {
  system?: string;
  content: ContentBlock[];
  maxTokens: number;
  effort?: "low" | "medium" | "high";
  fallbacks?: boolean;
  timeoutMs?: number;
}): Promise<{ text: string; model: string; stopReason: string | null }> {
  const client = claudeClient(opts.timeoutMs);
  const model = aiModel();
  const messages = [{ role: "user" as const, content: opts.content }];

  if (provider() === "anthropic") {
    const msg = await client.beta.messages
      .stream({
        model, max_tokens: opts.maxTokens, system: opts.system,
        ...(opts.effort ? { output_config: { effort: opts.effort } } : {}),
        ...(opts.fallbacks ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
        messages: messages as never,
      } as never)
      .finalMessage();
    return { text: textOf(msg.content as never), model: msg.model ?? model, stopReason: msg.stop_reason };
  }

  const msg = await client.messages
    .stream({ model, max_tokens: opts.maxTokens, system: opts.system, messages: messages as never })
    .finalMessage();
  return { text: textOf(msg.content as never), model: msg.model ?? model, stopReason: msg.stop_reason };
}

function textOf(content: { type: string; text?: string }[]): string {
  return content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
}

/** Human-readable reason for a failed call, never the raw upstream payload. */
export function explainAiError(message: string): string {
  if (/credit|billing|balance|insufficient|payment/i.test(message)) return `Kredit layanan AI (${providerLabel()}) habis atau penagihan bermasalah.`;
  if (/401|403|authentication|unauthor|invalid x-api-key|invalid api key/i.test(message)) return `Kunci API ${providerLabel()} ditolak. Periksa ${aiKeyName()}.`;
  if (/404|model/i.test(message) && /not.?found|not available|unknown/i.test(message)) return `Model "${aiModel()}" tidak tersedia di ${providerLabel()}. Ubah LONTAR_AI_MODEL.`;
  if (/429|rate/i.test(message)) return "Batas laju layanan AI tercapai. Coba lagi sebentar.";
  return "Pemanggilan AI gagal.";
}
