import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AgentCycleRecord } from "../types.js";

const DATA_DIR = path.resolve(process.cwd(), "data");
const JOURNAL_PATH = path.join(DATA_DIR, "journal.json");

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

export async function appendCycle(record: AgentCycleRecord): Promise<void> {
  await ensureDataDir();

  let existing: AgentCycleRecord[] = [];
  try {
    const raw = await readFile(JOURNAL_PATH, "utf8");
    const parsed = JSON.parse(raw) as AgentCycleRecord[];
    if (Array.isArray(parsed)) {
      existing = parsed;
    }
  } catch {
    existing = [];
  }

  existing.unshift(record);
  const trimmed = existing.slice(0, 200);
  await writeFile(JOURNAL_PATH, JSON.stringify(trimmed, null, 2), "utf8");
}

export async function readJournal(limit = 20): Promise<AgentCycleRecord[]> {
  try {
    const raw = await readFile(JOURNAL_PATH, "utf8");
    const parsed = JSON.parse(raw) as AgentCycleRecord[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.slice(0, limit);
  } catch {
    return [];
  }
}

export async function getLatestCycle(): Promise<AgentCycleRecord | null> {
  const journal = await readJournal(1);
  return journal[0] ?? null;
}
