import { getSettingsSync } from "../config/settings.js";
import type { PerceptionBundle } from "../types.js";
import { perceiveMarket } from "./market.js";
import { perceiveNews } from "./news.js";
import { classifyRegime } from "./regime.js";
import { perceiveSolana } from "./solana.js";

export async function perceive(symbol = getSettingsSync().symbol): Promise<PerceptionBundle> {
  const market = await perceiveMarket(symbol);
  const [news, solana] = await Promise.all([
    perceiveNews(symbol),
    perceiveSolana(),
  ]);

  const regime = classifyRegime(market.candles, market.change24hPct);

  const summary = [
    `${market.symbol} $${market.lastPrice.toLocaleString()} (${market.change24hPct >= 0 ? "+" : ""}${market.change24hPct.toFixed(2)}% 24h)`,
    `Regime: ${regime.regime}`,
    market.fundingRate !== null ? `funding ${(market.fundingRate * 100).toFixed(4)}%` : null,
    `${news.length} news`,
    `Solana: ${solana.dexActivity} activity`,
  ]
    .filter(Boolean)
    .join(" · ");

  return { market, news, solana, regime, summary };
}
