import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSettingsSync } from "../config/settings.js";
import { runAgentCycle } from "./loop.js";
import type { AgentCycleRecord } from "../types.js";

const STATE_PATH = path.resolve(process.cwd(), "data", "autopilot.json");
const MAX_LOG = 80;

export type AutopilotPhase = "idle" | "running" | "waiting" | "stopped";
export type LogLevel = "info" | "cycle" | "error";

export interface AutopilotLogEntry {
  ts: string;
  level: LogLevel;
  message: string;
}

export interface AutopilotState {
  running: boolean;
  phase: AutopilotPhase;
  startedAt: string | null;
  stoppedAt: string | null;
  cyclesCompleted: number;
  lastCycleAt: string | null;
  nextCycleAt: string | null;
  lastError: string | null;
  lastCycleId: string | null;
  log: AutopilotLogEntry[];
}

const defaultState = (): AutopilotState => ({
  running: false,
  phase: "idle",
  startedAt: null,
  stoppedAt: null,
  cyclesCompleted: 0,
  lastCycleAt: null,
  nextCycleAt: null,
  lastError: null,
  lastCycleId: null,
  log: [],
});

let state: AutopilotState = defaultState();
let loopPromise: Promise<void> | null = null;
let stopRequested = false;
let cycleInFlight = false;

async function persistState(): Promise<void> {
  await mkdir(path.dirname(STATE_PATH), { recursive: true });
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2), "utf8");
}

export async function initAutopilot(): Promise<AutopilotState> {
  try {
    const raw = await readFile(STATE_PATH, "utf8");
    const parsed = JSON.parse(raw) as AutopilotState;
    state = { ...defaultState(), ...parsed, running: false, phase: "stopped" };
  } catch {
    state = defaultState();
  }
  await persistState();
  return getAutopilotState();
}

function pushLog(level: LogLevel, message: string): void {
  state.log.unshift({ ts: new Date().toISOString(), level, message });
  if (state.log.length > MAX_LOG) {
    state.log = state.log.slice(0, MAX_LOG);
  }
}

export function getAutopilotState(): AutopilotState {
  return { ...state, log: [...state.log] };
}

export function isCycleInFlight(): boolean {
  return cycleInFlight;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runLoop(): Promise<void> {
  pushLog("info", "Autopilot started");
  await persistState();

  while (!stopRequested) {
    const settings = getSettingsSync();
    state.phase = "running";
    state.nextCycleAt = null;
    cycleInFlight = true;
    await persistState();

    try {
      pushLog("info", `Cycle ${state.cyclesCompleted + 1} started (${settings.symbol})`);
      const record = await runAgentCycle(settings.symbol);
      state.cyclesCompleted += 1;
      state.lastCycleAt = record.completedAt;
      state.lastCycleId = record.id;
      state.lastError = null;
      logCycleResult(record);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown cycle error";
      state.lastError = message;
      pushLog("error", message);
    } finally {
      cycleInFlight = false;
    }

    if (stopRequested) break;

    state.phase = "waiting";
    const waitMs = getSettingsSync().intervalMs;
    state.nextCycleAt = new Date(Date.now() + waitMs).toISOString();
    await persistState();

    const step = 1000;
    let waited = 0;
    while (waited < waitMs && !stopRequested) {
      await sleep(step);
      waited += step;
    }
  }

  state.running = false;
  state.phase = "stopped";
  state.stoppedAt = new Date().toISOString();
  state.nextCycleAt = null;
  pushLog("info", "Autopilot stopped");
  await persistState();
  loopPromise = null;
}

function logCycleResult(record: AgentCycleRecord): void {
  const decision = record.riskVerdict.adjustedDecision;
  const price = record.perception.market.lastPrice;
  pushLog(
    "cycle",
    `${decision.action.toUpperCase()} @ $${price.toLocaleString()} · ${record.execution.status} · equity $${record.portfolio?.equity.toFixed(2) ?? "?"}`
  );
}

export async function startAutopilot(): Promise<AutopilotState> {
  if (state.running) {
    return getAutopilotState();
  }

  stopRequested = false;
  state.running = true;
  state.phase = "running";
  state.startedAt = new Date().toISOString();
  state.stoppedAt = null;
  await persistState();

  loopPromise = runLoop();
  return getAutopilotState();
}

export async function stopAutopilot(): Promise<AutopilotState> {
  if (!state.running) {
    return getAutopilotState();
  }

  stopRequested = true;
  pushLog("info", "Stop requested, finishing current step...");
  await persistState();

  if (loopPromise) {
    await loopPromise;
  }

  return getAutopilotState();
}
