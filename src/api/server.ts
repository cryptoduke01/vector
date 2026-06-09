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
      { step: 1, id: "perceive", label: "Read live market data" },
      { step: 2, id: "tribunal", label: "Four signals vote" },
      { step: 3, id: "decide", label: "Qwen makes the call" },
      { step: 4, id: "risk", label: "Risk checks run" },
      { step: 5, id: "execute", label: settings.dryRun ? "Simulate order" : "Send to Bitget" },
      { step: 6, id: "journal", label: "Log to audit trail" },
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

app.post("/api/cycle", async (_req, res) => {
  const autopilot = getAutopilotState();
  if (autopilot.running) {
    res.status(409).json({
      ok: false,
      error: "Autopilot is running. Stop it or watch the live log.",
    });
    return;
  }
  if (isCycleInFlight()) {
    res.status(409).json({ ok: false, error: "Cycle already in progress" });
    return;
  }

  const settings = await getSettings();
  const record = await runAgentCycle(settings.symbol);
  res.json(record);
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
