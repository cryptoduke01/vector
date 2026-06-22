import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import {
  getAutopilotState,
  initAutopilot,
  isCycleInFlight,
  startAutopilot,
  stopAutopilot,
} from "../agent/autopilot.js";
import { runAgentCycle } from "../agent/loop.js";
import { env, hasBitgetAuth, hasExa, hasLlm } from "../config/env.js";
import {
  getActiveProfileId,
  listProfiles,
  setActiveProfileId,
} from "../config/profiles.js";
import {
  agentSettingsSchema,
  getSettings,
  initSettings,
  TRADING_PAIRS,
  updateSettings,
} from "../config/settings.js";
import { getPaperPortfolio } from "../portfolio/paper.js";
import { getLatestCycle, readJournal } from "../storage/journal.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "../../public");

const app = express();

app.use(cors());
app.use(express.json());

async function boot() {
  await initSettings();
  await initAutopilot();
}

app.get("/health", async (_req, res) => {
  const settings = await getSettings();
  res.json({ ok: true, agent: "vector", dryRun: settings.dryRun });
});

app.get("/api/meta", async (_req, res) => {
  const settings = await getSettings();
  res.json({
    name: "Vector",
    track: "Trading agent",
    hackathon: "Bitget AI Hackathon S1",
    symbol: settings.symbol,
    dryRun: settings.dryRun,
    hasBitgetAuth,
    llm: hasLlm ? { provider: env.LLM_PROVIDER, model: env.LLM_MODEL } : null,
    pipeline: [
      { step: 1, id: "memory", label: "Load agent memory" },
      { step: 2, id: "perceive", label: "Read live market data" },
      { step: 3, id: "tribunal", label: "Four signals vote" },
      { step: 4, id: "decide", label: "Qwen plans and decides" },
      { step: 5, id: "risk", label: "Risk checks run" },
      { step: 6, id: "execute", label: settings.dryRun ? "Simulate order" : "Send to Bitget" },
      { step: 7, id: "reflect", label: "Agent reflects on outcome" },
      { step: 8, id: "journal", label: "Log to audit trail" },
    ],
    dataSources: [
      {
        id: "market",
        label: "BTC price, candles, funding",
        provider: "Bitget public API",
        kind: "live",
      },
      {
        id: "news",
        label: "Crypto news headlines",
        provider: "Exa search",
        kind: hasExa ? "live" : "off",
      },
      {
        id: "onchain",
        label: "Solana DEX activity",
        provider: "DexScreener",
        kind: "live",
      },
      {
        id: "ai",
        label: "Trade reasoning",
        provider: `Qwen (${env.LLM_MODEL ?? "hackathon"})`,
        kind: hasLlm ? "ai" : "off",
      },
      {
        id: "wallet",
        label: "Portfolio balance",
        provider: "Paper ledger ($1,000 start)",
        kind: "simulated",
      },
      {
        id: "orders",
        label: "Order placement",
        provider: settings.dryRun ? "Skipped in dry run" : "Bitget futures API",
        kind: settings.dryRun ? "simulated" : "live",
      },
    ],
    hackathonFit: [
      "Trading agent track: autonomous perceive-decide-execute loop",
      "Uses Bitget market data and bitget-core for execution",
      "Uses hackathon Qwen endpoint for decisions",
      "Sim and paper trading allowed per official rules",
    ],
  });
});

app.get("/api/settings", async (_req, res) => {
  const settings = await getSettings();
  res.json({
    settings,
    tradingPairs: TRADING_PAIRS,
    hasBitgetAuth,
    envLocked: {
      llm: hasLlm,
      exa: hasExa,
    },
  });
});

app.patch("/api/settings", async (req, res) => {
  try {
    const autopilot = getAutopilotState();
    if (autopilot.running) {
      res.status(409).json({
        ok: false,
        error: "Stop autopilot before changing settings",
      });
      return;
    }

    const parsed = agentSettingsSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: parsed.error.message });
      return;
    }

    if (!parsed.data.dryRun && !hasBitgetAuth) {
      res.status(400).json({
        ok: false,
        error: "Add Bitget API keys to .env before disabling dry run",
      });
      return;
    }

    const settings = await updateSettings(parsed.data);
    res.json({ ok: true, settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid settings";
    res.status(400).json({ ok: false, error: message });
  }
});

app.get("/api/autopilot", (_req, res) => {
  res.json(getAutopilotState());
});

app.post("/api/autopilot/start", async (_req, res) => {
  if (isCycleInFlight()) {
    res.status(409).json({ ok: false, error: "A cycle is already running" });
    return;
  }
  const state = await startAutopilot();
  res.json({ ok: true, ...state });
});

app.post("/api/autopilot/stop", async (_req, res) => {
  const state = await stopAutopilot();
  res.json({ ok: true, ...state });
});

app.get("/api/profiles", async (_req, res) => {
  const activeId = await getActiveProfileId();
  res.json({ activeId, profiles: listProfiles() });
});

app.post("/api/profiles/:id", async (req, res) => {
  try {
    const profile = await setActiveProfileId(req.params.id);
    res.json({ ok: true, activeId: profile.id, profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid profile";
    res.status(400).json({ ok: false, error: message });
  }
});

app.get("/api/status", async (_req, res) => {
  const [latest, portfolio, activeProfileId, settings] = await Promise.all([
    getLatestCycle(),
    getPaperPortfolio(),
    getActiveProfileId(),
    getSettings(),
  ]);
  const autopilot = getAutopilotState();
  res.json({
    symbol: settings.symbol,
    dryRun: settings.dryRun,
    intervalMs: settings.intervalMs,
    maxNotionalUsdt: settings.maxNotionalUsdt,
    maxLeverage: settings.maxLeverage,
    llmProvider: env.LLM_PROVIDER,
    activeProfileId,
    profiles: listProfiles(),
    autopilot,
    latest,
    portfolio,
  });
});

app.get("/api/portfolio", async (_req, res) => {
  const portfolio = await getPaperPortfolio();
  res.json(portfolio);
});

app.get("/api/journal", async (req, res) => {
  const limit = Number(req.query.limit ?? 20);
  const journal = await readJournal(Number.isFinite(limit) ? limit : 20);
  res.json({ count: journal.length, cycles: journal });
});

app.get("/api/export", async (_req, res) => {
  const journal = await readJournal(500);
  const portfolio = await getPaperPortfolio();
  let prevEquity = portfolio.startingEquity;
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
  const payload = {
    exportedAt: new Date().toISOString(),
    agent: "Vector",
    track: "Trading Agent",
    mode: "paper / dry-run",
    startingEquity: portfolio.startingEquity,
    endingEquity: portfolio.equity,
    totalCycles: trades.length,
    trades,
  };
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="vector-paper-trading-log.json"'
  );
  res.json(payload);
});

app.get("/api/performance", async (_req, res) => {
  const journal = await readJournal(500);
  const portfolio = await getPaperPortfolio();

  const actionCounts = { long: 0, short: 0, hold: 0, close: 0 };
  const statusCounts = { simulated: 0, executed: 0, skipped: 0, failed: 0 };
  const pairCounts: Record<string, number> = {};
  let confidenceSum = 0;
  let confidenceN = 0;
  let conflictCycles = 0;

  for (const cycle of journal) {
    const decision = cycle.riskVerdict?.adjustedDecision ?? cycle.rawDecision;
    const action = (decision?.action ?? "hold") as keyof typeof actionCounts;
    if (action in actionCounts) actionCounts[action] += 1;
    const status = (cycle.execution?.status ?? "skipped") as keyof typeof statusCounts;
    if (status in statusCounts) statusCounts[status] += 1;
    pairCounts[cycle.symbol] = (pairCounts[cycle.symbol] ?? 0) + 1;
    if (typeof decision?.confidence === "number") {
      confidenceSum += decision.confidence;
      confidenceN += 1;
    }
    if (cycle.tribunal?.conflict) conflictCycles += 1;
  }

  const equityCurve = portfolio.equityCurve ?? [];
  let peak = portfolio.startingEquity;
  let maxDrawdown = 0;
  for (const point of equityCurve) {
    if (point.equity > peak) peak = point.equity;
    const drawdown = peak > 0 ? (peak - point.equity) / peak : 0;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  res.json({
    totalCycles: journal.length,
    actionCounts,
    statusCounts,
    pairCounts,
    averageConfidence: confidenceN > 0 ? Number((confidenceSum / confidenceN).toFixed(3)) : null,
    conflictCycles,
    conflictRate: journal.length > 0 ? Number((conflictCycles / journal.length).toFixed(3)) : 0,
    portfolio: {
      startingEquity: portfolio.startingEquity,
      equity: portfolio.equity,
      realizedPnl: portfolio.realizedPnl,
      unrealizedPnl: portfolio.unrealizedPnl,
      totalTrades: portfolio.totalTrades,
      winRate: portfolio.winRate,
      wins: portfolio.wins,
      losses: portfolio.losses,
      maxDrawdownPct: Number((maxDrawdown * 100).toFixed(2)),
    },
  });
});

let manualCycleInFlight = false;

app.post("/api/cycle", async (_req, res) => {
  const autopilot = getAutopilotState();
  if (autopilot.running) {
    res.status(409).json({
      ok: false,
      error: "Autopilot is running. Stop it or watch the live log.",
    });
    return;
  }
  if (isCycleInFlight() || manualCycleInFlight) {
    res.status(409).json({ ok: false, error: "Cycle already in progress" });
    return;
  }

  manualCycleInFlight = true;
  try {
    const settings = await getSettings();
    const record = await runAgentCycle(settings.symbol);
    res.json(record);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cycle failed";
    res.status(500).json({ ok: false, error: message });
  } finally {
    manualCycleInFlight = false;
  }
});

app.use(express.static(publicDir));

app.get("/", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

boot()
  .then(() => {
    app.listen(env.PORT, () => {
      console.log(`Vector demo API listening on http://localhost:${env.PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to boot Vector API:", error);
    process.exit(1);
  });
