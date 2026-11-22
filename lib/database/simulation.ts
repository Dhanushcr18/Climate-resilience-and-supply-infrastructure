import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface PersistedSimulationState {
  state: Record<string, unknown>;
  updatedAt: string;
}

const defaultDatabasePath =
  path.join(process.cwd(), "data", "simulation-state.json");

function databasePath(): string {
  return process.env.SIMULATION_DATABASE_PATH || defaultDatabasePath;
}

function createSupabaseDatabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function ensureDatabaseDirectory(): Promise<void> {
  await mkdir(path.dirname(databasePath()), { recursive: true });
}

export async function readSimulationState(): Promise<PersistedSimulationState> {
  const supabase = createSupabaseDatabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("simulation_state")
      .select("state, updated_at")
      .eq("id", "shared")
      .maybeSingle();
    if (!error && data) {
      return {
        state: (data.state as Record<string, unknown>) || {},
        updatedAt: data.updated_at as string,
      };
    }
  }
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
  const supabase = createSupabaseDatabaseClient();
  if (supabase) {
    const current = replace
      ? { state: {}, updatedAt: new Date(0).toISOString() }
      : await readSimulationState();
    const next: PersistedSimulationState = {
      state: replace ? { ...patch } : { ...current.state, ...patch },
      updatedAt: new Date().toISOString(),
    };
    const { error } = await supabase.from("simulation_state").upsert(
      {
        id: "shared",
        state: next.state,
        updated_at: next.updatedAt,
      },
      { onConflict: "id" }
    );
    if (!error) return next;
  }

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
