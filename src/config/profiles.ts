import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { env } from "./env.js";
import type { MarketRegime, SignalProfile, SignalWeights } from "../types.js";

const PROFILE_PATH = path.resolve(process.cwd(), "data", "profile.json");

export const SIGNAL_PROFILES: Record<string, SignalProfile> = {
  balanced: {
    id: "balanced",
    name: "Balanced",
    description: "Equal weight across all four channels. Default jury.",
    weights: { technical: 1, funding: 1, news: 1, onchain: 1 },
  },
  momentum: {
    id: "momentum",
    name: "Momentum",
    description: "Favors technical trend-following. Best in trending regimes.",
    weights: { technical: 1.8, funding: 0.6, news: 0.8, onchain: 0.9 },
  },
  contrarian: {
    id: "contrarian",
    name: "Contrarian",
    description: "Heavy funding + news. Fades crowded positioning.",
    weights: { technical: 0.7, funding: 1.6, news: 1.4, onchain: 0.8 },
  },
  "sol-alpha": {
    id: "sol-alpha",
    name: "SOL Alpha",
    description: "On-chain heavy. Uses Solana DEX activity as leading indicator.",
    weights: { technical: 0.8, funding: 0.7, news: 0.9, onchain: 2 },
  },
};

const REGIME_MULTIPLIERS: Record<MarketRegime, Partial<SignalWeights>> = {
  trending_up: { technical: 1.2, onchain: 1.1 },
  trending_down: { technical: 1.2, funding: 1.15 },
  ranging: { funding: 1.2, news: 1.1 },
  volatile: { technical: 0.7, funding: 0.8, news: 0.8, onchain: 0.7 },
};

export async function getActiveProfileId(): Promise<string> {
  try {
    const raw = await readFile(PROFILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as { profileId?: string };
    if (parsed.profileId && SIGNAL_PROFILES[parsed.profileId]) {
      return parsed.profileId;
    }
  } catch {
    // use env default
  }
  return env.SIGNAL_PROFILE;
}

export async function setActiveProfileId(profileId: string): Promise<SignalProfile> {
  const profile = SIGNAL_PROFILES[profileId];
  if (!profile) {
    throw new Error(`Unknown profile: ${profileId}`);
  }
  await mkdir(path.dirname(PROFILE_PATH), { recursive: true });
  await writeFile(PROFILE_PATH, JSON.stringify({ profileId, updatedAt: new Date().toISOString() }, null, 2));
  return profile;
}

export async function resolveWeights(regime: MarketRegime): Promise<{
  profile: SignalProfile;
  effective: SignalWeights;
}> {
  const profileId = await getActiveProfileId();
  const profile = SIGNAL_PROFILES[profileId];
  const multipliers = REGIME_MULTIPLIERS[regime];

  const effective: SignalWeights = {
    technical: profile.weights.technical * (multipliers.technical ?? 1),
    funding: profile.weights.funding * (multipliers.funding ?? 1),
    news: profile.weights.news * (multipliers.news ?? 1),
    onchain: profile.weights.onchain * (multipliers.onchain ?? 1),
  };

  return { profile, effective };
}

export function listProfiles(): SignalProfile[] {
  return Object.values(SIGNAL_PROFILES);
}
