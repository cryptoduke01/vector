import type { SolanaSignal } from "../types.js";

const SOL_MINT = "So11111111111111111111111111111111111111112";

type DexPair = {
  priceUsd?: string;
  volume?: { h24?: number };
  priceChange?: { h24?: number };
  liquidity?: { usd?: number };
};

type DexScreenerResponse = {
  pairs?: DexPair[];
};

function activityLevel(volume24h: number): SolanaSignal["dexActivity"] {
  if (volume24h >= 50_000_000) return "high";
  if (volume24h >= 10_000_000) return "normal";
  return "low";
}

export async function perceiveSolana(): Promise<SolanaSignal> {
  const capturedAt = new Date().toISOString();

  try {
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${SOL_MINT}`,
      { signal: AbortSignal.timeout(8_000) }
    );

    if (!response.ok) {
      return emptySignal(capturedAt, "DexScreener request failed");
    }

    const payload = (await response.json()) as DexScreenerResponse;
    const pairs = payload.pairs ?? [];
    if (pairs.length === 0) {
      return emptySignal(capturedAt, "No Solana DEX pairs found");
    }

    const top = pairs.reduce((best, pair) => {
      const vol = pair.volume?.h24 ?? 0;
      const bestVol = best.volume?.h24 ?? 0;
      return vol > bestVol ? pair : best;
    }, pairs[0]);

    const solPriceUsd = top.priceUsd ? Number(top.priceUsd) : null;
    const solChange24hPct = top.priceChange?.h24 ?? null;
    const topPairVolume24h = top.volume?.h24 ?? null;
    const dexActivity = activityLevel(topPairVolume24h ?? 0);

    const summary = [
      solPriceUsd ? `SOL $${solPriceUsd.toFixed(2)}` : "SOL price n/a",
      solChange24hPct !== null ? `${solChange24hPct >= 0 ? "+" : ""}${solChange24hPct.toFixed(2)}% 24h` : null,
      topPairVolume24h ? `$${(topPairVolume24h / 1_000_000).toFixed(1)}M DEX vol` : null,
      `${dexActivity} on-chain activity`,
    ]
      .filter(Boolean)
      .join(", ");

    return {
      solPriceUsd,
      solChange24hPct,
      topPairVolume24h,
      dexActivity,
      summary,
      capturedAt,
    };
  } catch {
    return emptySignal(capturedAt, "Solana perception unavailable");
  }
}

function emptySignal(capturedAt: string, summary: string): SolanaSignal {
  return {
    solPriceUsd: null,
    solChange24hPct: null,
    topPairVolume24h: null,
    dexActivity: "low",
    summary,
    capturedAt,
  };
}
