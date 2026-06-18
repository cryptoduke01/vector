import { z } from "zod";
import { getLlmConfig } from "../lib/llm.js";
import type { AgentCycleRecord } from "../types.js";

const reflectionSchema = z.object({
  reflection: z.string().min(20).max(400),
  nextFocus: z.string().min(5).max(120),
});

export interface AgentReflection {
  reflection: string;
  nextFocus: string;
}

export async function reflectOnCycle(record: AgentCycleRecord): Promise<AgentReflection> {
  const decision = record.riskVerdict.adjustedDecision;
  const equity = record.portfolio?.equity ?? 0;
  const price = record.perception.market.lastPrice;

  const fallback = (): AgentReflection => {
    const action = decision.action;
    const pos = record.portfolio?.openPosition;
    let reflection = `Cycle complete: ${action.toUpperCase()} on ${record.symbol} at $${price.toLocaleString()}.`;
    if (pos) {
      reflection += ` Open ${pos.side} $${pos.notionalUsdt} from $${pos.entryPrice.toLocaleString()}.`;
    } else {
      reflection += " Flat — no open exposure.";
    }
    reflection += ` Paper equity $${equity.toFixed(2)}.`;

    const nextFocus =
      record.tribunal.conflict
        ? "Wait for tribunal alignment before sizing up."
        : `Monitor ${record.tribunal.consensus} bias in ${record.perception.regime.regime} regime.`;

    return { reflection, nextFocus };
  };

  const llm = getLlmConfig();
  if (!llm) return fallback();

  const prompt = `You are Vector, an autonomous trading agent. Reflect on this completed cycle in 1-2 sentences (what happened, what you learned). Then state one focus for the next cycle.

Cycle:
- Action: ${decision.action}
- Confidence: ${(decision.confidence * 100).toFixed(0)}%
- Tribunal: ${record.tribunal.consensus}, alignment ${(record.tribunal.alignment * 100).toFixed(0)}%, conflict=${record.tribunal.conflict}
- Regime: ${record.perception.regime.regime}
- Execution: ${record.execution.status}
- Equity: $${equity.toFixed(2)}
- Plan was: ${decision.plan || decision.reasoning.slice(0, 150)}

Return JSON: { "reflection": "...", "nextFocus": "..." }`;

  try {
    const response = await fetch(`${llm.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${llm.apiKey}`,
      },
      body: JSON.stringify({
        model: llm.model,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 250,
      }),
    });

    if (!response.ok) return fallback();

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = payload.choices?.[0]?.message?.content;
    if (!raw) return fallback();

    const parsed = reflectionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : fallback();
  } catch {
    return fallback();
  }
}
