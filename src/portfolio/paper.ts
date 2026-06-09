import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AgentCycleRecord, PaperPortfolio, TradeAction } from "../types.js";

const DATA_DIR = path.resolve(process.cwd(), "data");
const PORTFOLIO_PATH = path.join(DATA_DIR, "portfolio.json");
const STARTING_EQUITY = 1000;

async function loadPortfolio(): Promise<PaperPortfolio> {
  try {
    const raw = await readFile(PORTFOLIO_PATH, "utf8");
    const parsed = JSON.parse(raw) as PaperPortfolio;
    if (parsed && typeof parsed.equity === "number") {
      return parsed;
    }
  } catch {
    // fresh portfolio
  }

  return {
    startingEquity: STARTING_EQUITY,
    equity: STARTING_EQUITY,
    realizedPnl: 0,
    unrealizedPnl: 0,
    totalTrades: 0,
    winRate: 0,
    wins: 0,
    losses: 0,
    openPosition: null,
    equityCurve: [{ ts: new Date().toISOString(), equity: STARTING_EQUITY }],
    updatedAt: new Date().toISOString(),
  };
}

async function savePortfolio(portfolio: PaperPortfolio): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(PORTFOLIO_PATH, JSON.stringify(portfolio, null, 2), "utf8");
}

function pnlForClose(
  side: "long" | "short",
  entryPrice: number,
  exitPrice: number,
  notionalUsdt: number
): number {
  const pct =
    side === "long"
      ? (exitPrice - entryPrice) / entryPrice
      : (entryPrice - exitPrice) / entryPrice;
  return notionalUsdt * pct;
}

export async function updatePaperPortfolio(
  record: AgentCycleRecord
): Promise<PaperPortfolio> {
  const portfolio = await loadPortfolio();
  const price = record.perception.market.lastPrice;
  const action: TradeAction =
    record.riskVerdict.adjustedDecision.action;
  const notional = record.riskVerdict.adjustedDecision.notionalUsdt;

  const executed =
    record.execution.status === "simulated" ||
    record.execution.status === "executed";

  if (portfolio.openPosition) {
    const pos = portfolio.openPosition;
    portfolio.unrealizedPnl = pnlForClose(
      pos.side,
      pos.entryPrice,
      price,
      pos.notionalUsdt
    );
  } else {
    portfolio.unrealizedPnl = 0;
  }

  if (!executed) {
    portfolio.equity = portfolio.startingEquity + portfolio.realizedPnl + portfolio.unrealizedPnl;
    portfolio.updatedAt = record.completedAt;
    await savePortfolio(portfolio);
    return portfolio;
  }

  if (action === "close" && portfolio.openPosition) {
    const pos = portfolio.openPosition;
    const pnl = pnlForClose(pos.side, pos.entryPrice, price, pos.notionalUsdt);
    portfolio.realizedPnl += pnl;
    portfolio.totalTrades += 1;
    if (pnl >= 0) portfolio.wins += 1;
    else portfolio.losses += 1;
    portfolio.winRate =
      portfolio.totalTrades > 0
        ? Number((portfolio.wins / portfolio.totalTrades).toFixed(2))
        : 0;
    portfolio.openPosition = null;
    portfolio.unrealizedPnl = 0;
  } else if ((action === "long" || action === "short") && notional > 0) {
    if (portfolio.openPosition) {
      const pos = portfolio.openPosition;
      const pnl = pnlForClose(pos.side, pos.entryPrice, price, pos.notionalUsdt);
      portfolio.realizedPnl += pnl;
      portfolio.totalTrades += 1;
      if (pnl >= 0) portfolio.wins += 1;
      else portfolio.losses += 1;
    }

    portfolio.openPosition = {
      side: action,
      entryPrice: price,
      notionalUsdt: notional,
      openedAt: record.completedAt,
      cycleId: record.id,
    };
    portfolio.unrealizedPnl = 0;
    portfolio.winRate =
      portfolio.totalTrades > 0
        ? Number((portfolio.wins / portfolio.totalTrades).toFixed(2))
        : 0;
  }

  portfolio.equity = portfolio.startingEquity + portfolio.realizedPnl + portfolio.unrealizedPnl;
  portfolio.equityCurve.push({
    ts: record.completedAt,
    equity: Number(portfolio.equity.toFixed(2)),
  });
  if (portfolio.equityCurve.length > 100) {
    portfolio.equityCurve = portfolio.equityCurve.slice(-100);
  }

  portfolio.updatedAt = record.completedAt;
  await savePortfolio(portfolio);
  return portfolio;
}

export async function getPaperPortfolio(): Promise<PaperPortfolio> {
  return loadPortfolio();
}
