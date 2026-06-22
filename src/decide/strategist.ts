import { z } from "zod";
import { getSettingsSync } from "../config/settings.js";
import { getLlmConfig } from "../lib/llm.js";
import { VectorError } from "../lib/errors.js";
import type { PerceptionBundle, TradeDecision, TribunalVerdict } from "../types.js";

const decisionSchema = z.object({
  action: z.enum(["long", "short", "close", "hold"]),
  confidence: z.number().min(0).max(1),
  notionalUsdt: z.number().min(0).max(10_000),
  leverage: z.number().int().min(1).max(125),
  stopLossPct: z.number().min(0.1).max(20).nullable(),
  takeProfitPct: z.number().min(0.1).max(50).nullable(),
  plan: z.string().min(10).max(600),
  reasoning: z.string().min(20).max(2000),
  risks: z.array(z.string()).min(1).max(8),
  signals: z.array(z.string()).min(1).max(12),
});

function formatCandles(bundle: PerceptionBundle): string {
  const recent = bundle.market.candles.slice(-6);
  if (recent.length === 0) return "No candle data";
  return recent
    .map(
      (c) =>
        `${new Date(c.timestamp).toISOString()} O:${c.open} H:${c.high} L:${c.low} C:${c.close}`
    )
    .join("\n");
}

function formatNews(bundle: PerceptionBundle): string {
  if (bundle.news.length === 0) return "No news — rely on tribunal + market structure.";
  return bundle.news
    .map((n, i) => `${i + 1}. ${n.title}\n   ${n.snippet.slice(0, 200)}`)
    .join("\n\n");
}

function formatTribunal(tribunal: TribunalVerdict): string {
  const lines = tribunal.channels.map(
    (c) =>
      `- ${c.name}: ${c.vote} (score ${c.score}, weight ${c.weight}, weighted ${c.weightedScore}) — ${c.detail}`
  );
  return [
    `Profile: ${tribunal.profile.name} — ${tribunal.profile.description}`,
    ...lines,
    `Weighted avg score: ${tribunal.weightedAvgScore} | Consensus: ${tribunal.consensus} | Alignment: ${(tribunal.alignment * 100).toFixed(0)}%`,
    `Recommended bias: ${tribunal.recommendedBias}`,
    tribunal.conflictNote ?? "No major channel conflict",
  ].join("\n");
}

function fallbackDecision(
  bundle: PerceptionBundle,
  tribunal: TribunalVerdict
): TradeDecision {
  const { lastPrice, change24hPct } = bundle.market;
  const bias = tribunal.recommendedBias;
  const settings = getSettingsSync();

  if (bias === "long" && tribunal.alignment >= 0.5) {
    return {
      action: "long",
      confidence: 0.55 + tribunal.alignment * 0.2,
      notionalUsdt: Math.min(40, settings.maxNotionalUsdt),
      leverage: bundle.regime.regime === "volatile" ? 2 : 3,
      stopLossPct: 2,
      takeProfitPct: 4,
      plan: `Enter long on tribunal alignment in ${bundle.regime.regime} regime.`,
      reasoning: `Signal tribunal leans long (${(tribunal.alignment * 100).toFixed(0)}% alignment) in ${bundle.regime.regime} regime. Fallback entry near $${lastPrice}.`,
      risks: ["Fallback mode", `24h ${change24hPct.toFixed(2)}%`],
      signals: tribunal.channels.map((c) => `${c.name}:${c.vote}`),
    };
  }

  if (bias === "short" && tribunal.alignment >= 0.5) {
    return {
      action: "short",
      confidence: 0.55 + tribunal.alignment * 0.2,
      notionalUsdt: Math.min(40, settings.maxNotionalUsdt),
      leverage: bundle.regime.regime === "volatile" ? 2 : 3,
      stopLossPct: 2,
      takeProfitPct: 4,
      plan: `Enter short on tribunal alignment in ${bundle.regime.regime} regime.`,
      reasoning: `Signal tribunal leans short (${(tribunal.alignment * 100).toFixed(0)}% alignment) in ${bundle.regime.regime} regime.`,
      risks: ["Fallback mode", "Short squeeze risk"],
      signals: tribunal.channels.map((c) => `${c.name}:${c.vote}`),
    };
  }

  return {
    action: "hold",
    confidence: 0.7,
    notionalUsdt: 0,
    leverage: 1,
    stopLossPct: null,
    takeProfitPct: null,
    plan: tribunal.conflict ? "Stay flat until tribunal channels align." : "No edge — preserve capital.",
    reasoning: tribunal.conflict
      ? `Signal tribunal is split — preserving capital until channels align.`
      : `No aligned edge in ${bundle.regime.regime} regime.`,
    risks: ["Low conviction environment"],
    signals: ["tribunal_hold"],
  };
}

export async function decideTrade(
  bundle: PerceptionBundle,
  tribunal: TribunalVerdict,
  memoryPrompt = "No prior cycles."
): Promise<TradeDecision> {
  const llm = getLlmConfig();
  if (!llm) {
    return fallbackDecision(bundle, tribunal);
  }

  const settings = getSettingsSync();
  const systemPrompt = `You are Vector, an autonomous crypto futures trading agent for Bitget Hackathon.
You receive a Signal Tribunal — 4 independent channels (technical, funding, news, on-chain) that voted before you.
You also receive MEMORY of your recent autonomous cycles — use it to avoid repeating mistakes and to stay consistent.
Your job: state a one-sentence plan, reconcile the weighted tribunal with market regime, then decide.
The trader's active profile (${tribunal.profile.name}) weights channels — respect high-weight channels more.
Return JSON only. Be conservative when tribunal.conflict is true or alignment < 0.5.
Never exceed ${settings.maxNotionalUsdt} USDT notional or ${settings.maxLeverage}x leverage.
Every long/short MUST include stopLossPct.
Explain which tribunal channels you agreed or disagreed with.`;

  const userPrompt = `Agent memory (recent cycles):
${memoryPrompt}

Perception: ${bundle.summary}

Market regime: ${bundle.regime.regime}
- ${bundle.regime.summary}
- volatility: ${bundle.regime.volatilityPct}%
- trend strength: ${bundle.regime.trendStrength}%

Signal Tribunal (pre-LLM jury):
${formatTribunal(tribunal)}

Market:
- symbol: ${bundle.market.symbol}
- last: ${bundle.market.lastPrice}
- 24h change %: ${bundle.market.change24hPct}
- funding: ${bundle.market.fundingRate}
- bid/ask: ${bundle.market.bid} / ${bundle.market.ask}

Recent candles:
${formatCandles(bundle)}

News:
${formatNews(bundle)}

Solana: ${bundle.solana.summary}

Return JSON (plan must be 1-2 short sentences under 500 chars, reasoning under 1500 chars):
{
  "action": "long" | "short" | "close" | "hold",
  "confidence": 0-1,
  "notionalUsdt": number,
  "leverage": integer,
  "stopLossPct": number | null,
  "takeProfitPct": number | null,
  "plan": "one sentence — what you intend this cycle before acting",
  "reasoning": "2-4 sentences — cite tribunal channels you followed or overrode",
  "risks": ["..."],
  "signals": ["tag1", "tag2"]
}`;

  const response = await fetch(`${llm.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${llm.apiKey}`,
    },
    body: JSON.stringify({
      model: llm.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 1200,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new VectorError("LLM_REQUEST_FAILED", `LLM request failed: ${text}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const raw = payload.choices?.[0]?.message?.content;
  if (!raw) {
    throw new VectorError("LLM_EMPTY_RESPONSE", "LLM returned empty content");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new VectorError("LLM_INVALID_JSON", "LLM returned invalid JSON");
  }

  const validated = decisionSchema.safeParse(parsed);
  if (!validated.success) {
    throw new VectorError("LLM_SCHEMA_MISMATCH", validated.error.message);
  }

  return validated.data;
}
