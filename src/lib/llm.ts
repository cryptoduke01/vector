import { env } from "../config/env.js";

export interface LlmConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  provider: "openai" | "qwen";
}

export function getLlmConfig(): LlmConfig | null {
  const apiKey = env.LLM_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  if (env.LLM_PROVIDER === "qwen") {
    return {
      provider: "qwen",
      apiKey,
      baseUrl: env.LLM_BASE_URL || "https://hackathon.bitgetops.com/v1",
      model: env.LLM_MODEL || "qwen3.6-plus",
    };
  }

  return {
    provider: "openai",
    apiKey,
    baseUrl: env.LLM_BASE_URL || "https://api.openai.com/v1",
    model: env.LLM_MODEL || "gpt-4o-mini",
  };
}
