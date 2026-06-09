import { randomUUID } from "node:crypto";
import { getSettingsSync } from "../config/settings.js";
import { decideTrade } from "../decide/strategist.js";
import { applyRiskGuards } from "../decide/risk.js";
import { runSignalTribunal } from "../decide/tribunal.js";
import { executeDecision } from "../execute/bitget.js";
import { logger } from "../lib/logger.js";
import { updatePaperPortfolio } from "../portfolio/paper.js";
import { perceive } from "../perceive/index.js";
import { appendCycle } from "../storage/journal.js";
import type { AgentCycleRecord } from "../types.js";

export async function runAgentCycle(symbol = getSettingsSync().symbol): Promise<AgentCycleRecord> {
  const startedAt = new Date().toISOString();
  const id = randomUUID();

  logger.info("cycle.start", { id, symbol });

  const perception = await perceive(symbol);
  const tribunal = await runSignalTribunal(perception, perception.regime);
  const rawDecision = await decideTrade(perception, tribunal);
  const riskVerdict = applyRiskGuards(rawDecision, tribunal);
  const decision = riskVerdict.adjustedDecision;

  let execution;
  try {
    execution = await executeDecision(decision, perception.market.lastPrice);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown execution error";
    execution = {
      status: "failed" as const,
      orderId: null,
      message,
      details: {},
    };
    logger.error("cycle.execute_failed", { id, message });
  }

  const record: AgentCycleRecord = {
    id,
    startedAt,
    completedAt: new Date().toISOString(),
    symbol,
    perception,
    tribunal,
    rawDecision,
    riskVerdict,
    execution,
  };

  record.portfolio = await updatePaperPortfolio(record);
  await appendCycle(record);

  logger.info("cycle.complete", {
    id,
    action: decision.action,
    status: execution.status,
    approved: riskVerdict.approved,
    tribunalConsensus: tribunal.consensus,
    regime: perception.regime.regime,
    equity: record.portfolio.equity,
  });

  return record;
}

export async function runAgentLoop(
  iterations?: number,
  intervalMs = getSettingsSync().intervalMs
): Promise<void> {
  let count = 0;

  while (iterations === undefined || count < iterations) {
    try {
      await runAgentCycle();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown cycle error";
      logger.error("cycle.failed", { message });
    }

    count += 1;
    if (iterations !== undefined && count >= iterations) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
