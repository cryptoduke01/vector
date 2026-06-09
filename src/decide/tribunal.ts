import { resolveWeights } from "../config/profiles.js";
import type {
  PerceptionBundle,
  RegimeAnalysis,
  SignalChannel,
  SignalVote,
  SignalWeights,
  TribunalVerdict,
} from "../types.js";

const BULLISH_WORDS = ["surge", "rally", "bull", "gain", "breakout", "approval", "etf", "inflow"];
const BEARISH_WORDS = ["crash", "drop", "bear", "hack", "ban", "selloff", "outflow", "fear", "lawsuit"];

function voteFromScore(score: number): SignalVote {
  if (score > 0.15) return "bullish";
  if (score < -0.15) return "bearish";
  return "neutral";
}

function channel(
  key: keyof SignalWeights,
  name: string,
  score: number,
  weight: number,
  detail: string
): SignalChannel {
  const clamped = Math.max(-1, Math.min(1, score));
  return {
    name,
    key,
    vote: voteFromScore(clamped),
    score: Number(clamped.toFixed(2)),
    weight: Number(weight.toFixed(2)),
    weightedScore: Number((clamped * weight).toFixed(2)),
    detail,
  };
}

function technicalChannel(bundle: PerceptionBundle, regime: RegimeAnalysis, weight: number): SignalChannel {
  const { change24hPct, candles } = bundle.market;
  const recent = candles.slice(-6);
  const momentum =
    recent.length >= 2
      ? (recent[recent.length - 1].close - recent[0].open) / recent[0].open
      : 0;

  let score = change24hPct / 5 + momentum * 10;
  if (regime.regime === "trending_up") score += 0.2;
  if (regime.regime === "trending_down") score -= 0.2;
  if (regime.regime === "volatile") score *= 0.5;

  return channel(
    "technical",
    "Technical",
    score,
    weight,
    `24h ${change24hPct.toFixed(2)}%, 6-candle momentum ${(momentum * 100).toFixed(2)}%`
  );
}

function fundingChannel(bundle: PerceptionBundle, weight: number): SignalChannel {
  const rate = bundle.market.fundingRate;
  if (rate === null) {
    return channel("funding", "Funding", 0, weight, "Funding data unavailable");
  }

  const score = -rate * 8000;
  return channel(
    "funding",
    "Funding",
    score,
    weight,
    `Rate ${(rate * 100).toFixed(4)}% — ${score > 0 ? "shorts paying longs" : "longs paying shorts"}`
  );
}

function newsChannel(bundle: PerceptionBundle, weight: number): SignalChannel {
  if (bundle.news.length === 0) {
    return channel("news", "News", 0, weight, "No news ingested");
  }

  let bull = 0;
  let bear = 0;
  for (const item of bundle.news) {
    const text = `${item.title} ${item.snippet}`.toLowerCase();
    if (BULLISH_WORDS.some((w) => text.includes(w))) bull += 1;
    if (BEARISH_WORDS.some((w) => text.includes(w))) bear += 1;
  }

  const raw = (bull - bear) / Math.max(bundle.news.length, 1);
  return channel(
    "news",
    "News",
    raw,
    weight,
    `${bull} bullish / ${bear} bearish cues across ${bundle.news.length} articles`
  );
}

function onchainChannel(bundle: PerceptionBundle, weight: number): SignalChannel {
  const { solChange24hPct, dexActivity } = bundle.solana;
  let score = 0;

  if (solChange24hPct !== null) {
    score += Math.max(-0.6, Math.min(0.6, solChange24hPct / 8));
  }
  if (dexActivity === "high") score += 0.15;
  if (dexActivity === "low") score -= 0.1;

  return channel("onchain", "On-chain", score, weight, bundle.solana.summary);
}

export async function runSignalTribunal(
  bundle: PerceptionBundle,
  regime: RegimeAnalysis
): Promise<TribunalVerdict> {
  const { profile, effective: effectiveWeights } = await resolveWeights(regime.regime);

  const channels = [
    technicalChannel(bundle, regime, effectiveWeights.technical),
    fundingChannel(bundle, effectiveWeights.funding),
    newsChannel(bundle, effectiveWeights.news),
    onchainChannel(bundle, effectiveWeights.onchain),
  ];

  const totalWeight = channels.reduce((sum, c) => sum + c.weight, 0);
  const avgScore = channels.reduce((sum, c) => sum + c.score, 0) / channels.length;
  const weightedAvgScore =
    channels.reduce((sum, c) => sum + c.weightedScore, 0) / Math.max(totalWeight, 1);

  const votes = channels.map((c) => c.vote);
  const bullish = votes.filter((v) => v === "bullish").length;
  const bearish = votes.filter((v) => v === "bearish").length;
  const neutral = votes.filter((v) => v === "neutral").length;

  const maxVote = Math.max(bullish, bearish, neutral);
  const alignment = maxVote / channels.length;

  let consensus: SignalVote = "neutral";
  if (bullish > bearish && bullish > neutral) consensus = "bullish";
  else if (bearish > bullish && bearish > neutral) consensus = "bearish";

  const conflict =
    bullish > 0 && bearish > 0 && Math.abs(bullish - bearish) <= 1;

  const conflictNote = conflict
    ? `Split jury: ${bullish} bullish vs ${bearish} bearish — Qwen must reconcile before sizing up`
    : null;

  let recommendedBias: "long" | "short" | "hold" = "hold";
  if (weightedAvgScore > 0.18 && alignment >= 0.5) recommendedBias = "long";
  else if (weightedAvgScore < -0.18 && alignment >= 0.5) recommendedBias = "short";

  if (regime.regime === "volatile" && alignment < 0.75) {
    recommendedBias = "hold";
  }

  return {
    profile,
    effectiveWeights,
    channels,
    consensus,
    alignment: Number(alignment.toFixed(2)),
    avgScore: Number(avgScore.toFixed(2)),
    weightedAvgScore: Number(weightedAvgScore.toFixed(2)),
    conflict,
    conflictNote,
    recommendedBias,
  };
}
