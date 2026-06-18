import { readJournal } from "../storage/journal.js";

export interface MemoryEntry {
  completedAt: string;
  symbol: string;
  action: string;
  price: number;
  notionalUsdt: number;
  equity: number;
  status: string;
  reflection?: string;
}

export async function getRecentMemory(limit = 5): Promise<MemoryEntry[]> {
  const journal = await readJournal(limit);
  return journal.map((cycle) => {
    const decision = cycle.riskVerdict?.adjustedDecision ?? cycle.rawDecision;
    return {
      completedAt: cycle.completedAt,
      symbol: cycle.symbol,
      action: decision.action,
      price: cycle.perception.market.lastPrice,
      notionalUsdt: decision.notionalUsdt,
      equity: cycle.portfolio?.equity ?? 0,
      status: cycle.execution.status,
      reflection: cycle.agentContext?.reflection,
    };
  });
}

export function formatMemoryForPrompt(entries: MemoryEntry[]): string {
  if (!entries.length) {
    return "No prior cycles — this is your first run. State a clear plan for this cycle.";
  }

  const lines = entries.map((e, i) => {
    const ago = formatAgo(e.completedAt);
    const ref = e.reflection ? ` | Note: ${e.reflection.slice(0, 120)}` : "";
    return `${i + 1}. [${ago}] ${e.action.toUpperCase()} ${e.symbol} @ $${e.price.toLocaleString()} · $${e.notionalUsdt} notional · equity $${e.equity.toFixed(2)} · ${e.status}${ref}`;
  });

  return [
    "You have memory of recent autonomous cycles. Learn from outcomes — avoid repeating failed patterns.",
    ...lines,
  ].join("\n");
}

function formatAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
