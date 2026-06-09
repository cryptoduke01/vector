import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { env } from "./env.js";

const SETTINGS_PATH = path.resolve(process.cwd(), "data", "settings.json");

export const agentSettingsSchema = z.object({
  symbol: z.string().min(1).default("BTCUSDT"),
  dryRun: z.boolean().default(true),
  intervalMs: z.number().int().min(30_000).max(3_600_000).default(300_000),
  maxNotionalUsdt: z.number().positive().max(10_000).default(100),
  maxLeverage: z.number().int().min(1).max(125).default(5),
  productType: z
    .enum(["USDT-FUTURES", "COIN-FUTURES", "USDC-FUTURES"])
    .default("USDT-FUTURES"),
});

export type AgentSettings = z.infer<typeof agentSettingsSchema>;

function defaultsFromEnv(): AgentSettings {
  return agentSettingsSchema.parse({
    symbol: env.AGENT_SYMBOL,
    dryRun: env.AGENT_DRY_RUN,
    intervalMs: env.AGENT_INTERVAL_MS,
    maxNotionalUsdt: env.AGENT_MAX_NOTIONAL_USDT,
    maxLeverage: env.AGENT_MAX_LEVERAGE,
    productType: env.AGENT_PRODUCT_TYPE,
  });
}

let cached: AgentSettings = defaultsFromEnv();

export function getSettingsSync(): AgentSettings {
  return cached;
}

export async function initSettings(): Promise<AgentSettings> {
  try {
    const raw = await readFile(SETTINGS_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    const stored =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    cached = agentSettingsSchema.parse({ ...defaultsFromEnv(), ...stored });
  } catch {
    cached = defaultsFromEnv();
    await saveSettings(cached);
  }
  return cached;
}

export async function getSettings(): Promise<AgentSettings> {
  return cached;
}

export async function saveSettings(settings: AgentSettings): Promise<AgentSettings> {
  await mkdir(path.dirname(SETTINGS_PATH), { recursive: true });
  await writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2), "utf8");
  cached = settings;
  return cached;
}

export async function updateSettings(
  partial: Partial<AgentSettings>
): Promise<AgentSettings> {
  const next = agentSettingsSchema.parse({ ...cached, ...partial });
  return saveSettings(next);
}
