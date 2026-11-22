import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export interface PersistedSimulationState {
  state: Record<string, unknown>;
  updatedAt: string;
}

const defaultDatabasePath =
  path.join(process.cwd(), "data", "simulation-state.json");

function databasePath(): string {
  return process.env.SIMULATION_DATABASE_PATH || defaultDatabasePath;
}

async function ensureDatabaseDirectory(): Promise<void> {
  await mkdir(path.dirname(databasePath()), { recursive: true });
}

export async function readSimulationState(): Promise<PersistedSimulationState> {
  try {
    const raw = await readFile(databasePath(), "utf8");
    const parsed = JSON.parse(raw) as PersistedSimulationState;
    if (!parsed || typeof parsed !== "object" || !parsed.state) {
      return { state: {}, updatedAt: new Date(0).toISOString() };
    }
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { state: {}, updatedAt: new Date(0).toISOString() };
    }
    throw error;
  }
}

export async function writeSimulationState(
  patch: Record<string, unknown>,
  replace = false
): Promise<PersistedSimulationState> {
  await ensureDatabaseDirectory();
  const current = replace ? { state: {}, updatedAt: new Date(0).toISOString() } : await readSimulationState();
  const next: PersistedSimulationState = {
    state: replace ? { ...patch } : { ...current.state, ...patch },
    updatedAt: new Date().toISOString(),
  };
  const target = databasePath();
  const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temp, JSON.stringify(next, null, 2), "utf8");
  await rename(temp, target);
  return next;
}
