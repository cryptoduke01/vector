import type { Candle, MarketRegime, RegimeAnalysis } from "../types.js";

function calcVolatility(candles: Candle[]): number {
  if (candles.length < 4) return 0;
  const returns: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1].close;
    if (prev === 0) continue;
    returns.push((candles[i].close - prev) / prev);
  }
  if (returns.length === 0) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance) * 100;
}

function calcTrendStrength(candles: Candle[]): number {
  if (candles.length < 6) return 0;
  const recent = candles.slice(-12);
  const first = recent[0].close;
  const last = recent[recent.length - 1].close;
  if (first === 0) return 0;
  return ((last - first) / first) * 100;
}

export function classifyRegime(candles: Candle[], change24hPct: number): RegimeAnalysis {
  const volatilityPct = calcVolatility(candles);
  const trendStrength = calcTrendStrength(candles);

  let regime: MarketRegime = "ranging";

  if (volatilityPct > 0.35) {
    regime = "volatile";
  } else if (trendStrength > 0.8 || change24hPct > 1.2) {
    regime = "trending_up";
  } else if (trendStrength < -0.8 || change24hPct < -1.2) {
    regime = "trending_down";
  }

  const labels: Record<MarketRegime, string> = {
    trending_up: "Uptrend — favor momentum longs, wider stops",
    trending_down: "Downtrend — favor shorts or flat",
    ranging: "Range-bound — mean reversion, smaller size",
    volatile: "High volatility — reduce size, widen stops or hold",
  };

  return {
    regime,
    volatilityPct: Number(volatilityPct.toFixed(3)),
    trendStrength: Number(trendStrength.toFixed(3)),
    summary: labels[regime],
  };
}
