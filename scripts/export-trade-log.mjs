#!/usr/bin/env node
/**
 * Export paper trading log for hackathon submission.
 * Judges need: timestamp, pair, direction, price, quantity, balance change.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const JOURNAL_PATH = path.resolve("data/journal.json");
const OUT_DIR = path.resolve("submissions");
const OUT_PATH = path.join(OUT_DIR, "paper-trading-log.json");

const journal = JSON.parse(await readFile(JOURNAL_PATH, "utf8"));
if (!Array.isArray(journal)) {
  throw new Error("journal.json must be an array");
}

let prevEquity = journal[journal.length - 1]?.portfolio?.startingEquity ?? 1000;

const trades = [...journal].reverse().map((cycle) => {
  const decision = cycle.riskVerdict?.adjustedDecision ?? cycle.rawDecision;
  const equity = cycle.portfolio?.equity ?? prevEquity;
  const balanceChange = Number((equity - prevEquity).toFixed(4));
  prevEquity = equity;

  return {
    timestamp: cycle.completedAt,
    tradingPair: cycle.symbol,
    direction: decision.action,
    price: cycle.perception?.market?.lastPrice ?? null,
    notionalUsdt: decision.notionalUsdt,
    leverage: decision.leverage,
    accountBalance: equity,
    balanceChange,
    executionStatus: cycle.execution?.status ?? "unknown",
    plan: cycle.agentContext?.plan ?? decision.plan ?? null,
    reflection: cycle.agentContext?.reflection ?? null,
    nextFocus: cycle.agentContext?.nextFocus ?? null,
    cycleId: cycle.id,
  };
});

const summary = {
  exportedAt: new Date().toISOString(),
  agent: "Vector",
  track: "Trading Agent",
  mode: "paper / dry-run",
  startingEquity: journal[journal.length - 1]?.portfolio?.startingEquity ?? 1000,
  endingEquity: journal[0]?.portfolio?.equity ?? 1000,
  totalCycles: trades.length,
  trades,
};

await mkdir(OUT_DIR, { recursive: true });
await writeFile(OUT_PATH, JSON.stringify(summary, null, 2), "utf8");
console.log(`Exported ${trades.length} cycles → ${OUT_PATH}`);
