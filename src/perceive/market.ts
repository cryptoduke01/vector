import { getSettingsSync } from "../config/settings.js";
import { bitgetPublicGet } from "../lib/bitgetPublic.js";
import { VectorError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import type { Candle, MarketSnapshot } from "../types.js";

type TickerRow = {
  symbol?: string;
  lastPr?: string;
  change24h?: string;
  high24h?: string;
  low24h?: string;
  bidPr?: string;
  askPr?: string;
};

type FundingRow = {
  fundingRate?: string;
};

type OpenInterestRow = {
  openInterest?: string;
};

type CandleRow = string[];

function toNumber(value: string | undefined, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseCandles(rows: CandleRow[]): Candle[] {
  return rows
    .map((row) => ({
      timestamp: Number(row[0]),
      open: toNumber(row[1]),
      high: toNumber(row[2]),
      low: toNumber(row[3]),
      close: toNumber(row[4]),
      volume: toNumber(row[5]),
    }))
    .filter((c) => c.timestamp > 0);
}

async function safeFetch<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    logger.warn("market.partial_fail", { label, message });
    return null;
  }
}

export async function perceiveMarket(symbol = getSettingsSync().symbol): Promise<MarketSnapshot> {
  const productType = getSettingsSync().productType;
  const query = { symbol, productType };

  const tickerData = await bitgetPublicGet<TickerRow[]>(
    "/api/v2/mix/market/ticker",
    query
  );

  const ticker = Array.isArray(tickerData) ? tickerData[0] : undefined;
  if (!ticker?.lastPr) {
    throw new VectorError("MARKET_DATA_MISSING", `No ticker data for ${symbol}`);
  }

  const [fundingData, oiData, candleData] = await Promise.all([
    safeFetch("funding", () =>
      bitgetPublicGet<FundingRow[]>("/api/v2/mix/market/current-fund-rate", query)
    ),
    safeFetch("open-interest", () =>
      bitgetPublicGet<OpenInterestRow[]>("/api/v2/mix/market/open-interest", query)
    ),
    safeFetch("candles", () =>
      bitgetPublicGet<CandleRow[]>("/api/v2/mix/market/candles", {
        ...query,
        granularity: "15m",
        limit: "24",
      })
    ),
  ]);

  const funding = Array.isArray(fundingData) ? fundingData[0] : undefined;
  const openInterest = Array.isArray(oiData) ? oiData[0] : undefined;

  return {
    symbol,
    lastPrice: toNumber(ticker.lastPr),
    change24hPct: toNumber(ticker.change24h),
    high24h: toNumber(ticker.high24h),
    low24h: toNumber(ticker.low24h),
    fundingRate: funding?.fundingRate ? toNumber(funding.fundingRate) : null,
    openInterest: openInterest?.openInterest ? toNumber(openInterest.openInterest) : null,
    bid: ticker.bidPr ? toNumber(ticker.bidPr) : null,
    ask: ticker.askPr ? toNumber(ticker.askPr) : null,
    candles: parseCandles(Array.isArray(candleData) ? candleData : []),
    capturedAt: new Date().toISOString(),
  };
}
