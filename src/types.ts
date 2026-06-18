export type TradeAction = "long" | "short" | "close" | "hold";
export type SignalVote = "bullish" | "bearish" | "neutral";
export type MarketRegime = "trending_up" | "trending_down" | "ranging" | "volatile";

export interface MarketSnapshot {
  symbol: string;
  lastPrice: number;
  change24hPct: number;
  high24h: number;
  low24h: number;
  fundingRate: number | null;
  openInterest: number | null;
  bid: number | null;
  ask: number | null;
  candles: Candle[];
  capturedAt: string;
}

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface NewsItem {
  title: string;
  url: string;
  snippet: string;
  publishedAt: string | null;
}

export interface SolanaSignal {
  solPriceUsd: number | null;
  solChange24hPct: number | null;
  topPairVolume24h: number | null;
  dexActivity: "low" | "normal" | "high";
  summary: string;
  capturedAt: string;
}

export interface RegimeAnalysis {
  regime: MarketRegime;
  volatilityPct: number;
  trendStrength: number;
  summary: string;
}

export interface SignalWeights {
  technical: number;
  funding: number;
  news: number;
  onchain: number;
}

export interface SignalProfile {
  id: string;
  name: string;
  description: string;
  weights: SignalWeights;
}

export interface SignalChannel {
  name: string;
  key: keyof SignalWeights;
  vote: SignalVote;
  score: number;
  weight: number;
  weightedScore: number;
  detail: string;
}

export interface TribunalVerdict {
  profile: SignalProfile;
  effectiveWeights: SignalWeights;
  channels: SignalChannel[];
  consensus: SignalVote;
  alignment: number;
  avgScore: number;
  weightedAvgScore: number;
  conflict: boolean;
  conflictNote: string | null;
  recommendedBias: "long" | "short" | "hold";
}

export interface PerceptionBundle {
  market: MarketSnapshot;
  news: NewsItem[];
  solana: SolanaSignal;
  regime: RegimeAnalysis;
  summary: string;
}

export interface TradeDecision {
  action: TradeAction;
  confidence: number;
  notionalUsdt: number;
  leverage: number;
  stopLossPct: number | null;
  takeProfitPct: number | null;
  plan: string;
  reasoning: string;
  risks: string[];
  signals: string[];
}

export interface AgentContext {
  memoryUsed: number;
  plan: string;
  reflection: string;
  nextFocus: string;
}

export interface RiskVerdict {
  approved: boolean;
  adjustedDecision: TradeDecision;
  violations: string[];
}

export interface ExecutionResult {
  status: "skipped" | "simulated" | "executed" | "failed";
  orderId: string | null;
  message: string;
  details: Record<string, unknown>;
}

export interface PaperPosition {
  side: "long" | "short";
  entryPrice: number;
  notionalUsdt: number;
  openedAt: string;
  cycleId: string;
}

export interface PaperPortfolio {
  startingEquity: number;
  equity: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalTrades: number;
  winRate: number;
  wins: number;
  losses: number;
  openPosition: PaperPosition | null;
  equityCurve: Array<{ ts: string; equity: number }>;
  updatedAt: string;
}

export interface AgentCycleRecord {
  id: string;
  startedAt: string;
  completedAt: string;
  symbol: string;
  perception: PerceptionBundle;
  tribunal: TribunalVerdict;
  rawDecision: TradeDecision;
  riskVerdict: RiskVerdict;
  execution: ExecutionResult;
  portfolio?: PaperPortfolio;
  agentContext?: AgentContext;
}
