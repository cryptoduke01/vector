import { config } from "dotenv";
import { z } from "zod";

config();

function emptyToUndefined(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function optionalSecret() {
  return z.preprocess(emptyToUndefined, z.string().min(1).optional());
}

function optionalUrl() {
  return z.preprocess(emptyToUndefined, z.string().url().optional());
}

function optionalString() {
  return z.preprocess(emptyToUndefined, z.string().optional());
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4100),

  BITGET_API_KEY: optionalSecret(),
  BITGET_SECRET_KEY: optionalSecret(),
  BITGET_PASSPHRASE: optionalSecret(),

  LLM_PROVIDER: z.enum(["openai", "qwen"]).default("openai"),
  LLM_API_KEY: optionalSecret(),
  LLM_BASE_URL: optionalUrl(),
  LLM_MODEL: optionalString(),

  EXA_API_KEY: optionalSecret(),

  SIGNAL_PROFILE: z
    .enum(["balanced", "momentum", "contrarian", "sol-alpha"])
    .default("balanced"),

  AGENT_SYMBOL: z.string().default("BTCUSDT"),
  AGENT_PRODUCT_TYPE: z.enum(["USDT-FUTURES", "COIN-FUTURES", "USDC-FUTURES"]).default("USDT-FUTURES"),
  AGENT_INTERVAL_MS: z.coerce.number().int().positive().default(300_000),
  AGENT_MAX_NOTIONAL_USDT: z.coerce.number().positive().default(100),
  AGENT_MAX_LEVERAGE: z.coerce.number().int().min(1).max(125).default(5),
  AGENT_DRY_RUN: z
    .string()
    .optional()
    .transform((v) => v !== "false" && v !== "0"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment:", parsed.error.flatten().fieldErrors);
    throw new Error("Environment validation failed");
  }
  return parsed.data;
}

export const env = loadEnv();

export const hasBitgetAuth = Boolean(
  env.BITGET_API_KEY && env.BITGET_SECRET_KEY && env.BITGET_PASSPHRASE
);
export const hasLlm = Boolean(env.LLM_API_KEY);
export const hasExa = Boolean(env.EXA_API_KEY);
