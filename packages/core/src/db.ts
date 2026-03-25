import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";

export type DB = ReturnType<typeof createDb>;

export function createDb(dbPath: string) {
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}

export function createMemoryDb() {
  const sqlite = new Database(":memory:");
  return drizzle(sqlite, { schema });
}

export function migrateDb(dbPath: string) {
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS verses (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, parent_id TEXT, git_branch TEXT NOT NULL, fork_from_commit TEXT, config TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, verse_id TEXT, repo_commit TEXT, git_branch TEXT, worktree_path TEXT, claude_session_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'running', started_at TEXT NOT NULL, ended_at TEXT, total_cost_usd REAL, total_tokens INTEGER);
    CREATE TABLE IF NOT EXISTS steps (id TEXT PRIMARY KEY, run_id TEXT NOT NULL, seq INTEGER NOT NULL, kind TEXT NOT NULL, tool_name TEXT, summary TEXT NOT NULL DEFAULT '', started_at TEXT NOT NULL, ended_at TEXT, cost_usd REAL, tokens INTEGER);
    CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, run_id TEXT NOT NULL, step_id TEXT, ts TEXT NOT NULL, source TEXT NOT NULL, type TEXT NOT NULL, attrs TEXT NOT NULL DEFAULT '{}', payload_ref TEXT);
    CREATE TABLE IF NOT EXISTS artifacts (id TEXT PRIMARY KEY, run_id TEXT NOT NULL, step_id TEXT, type TEXT NOT NULL, path TEXT NOT NULL, hash TEXT NOT NULL, created_at TEXT NOT NULL, meta TEXT);
    CREATE INDEX IF NOT EXISTS idx_runs_verse ON runs(verse_id);
    CREATE INDEX IF NOT EXISTS idx_runs_session ON runs(claude_session_id);
    CREATE INDEX IF NOT EXISTS idx_runs_branch ON runs(git_branch);
    CREATE INDEX IF NOT EXISTS idx_steps_run ON steps(run_id);
    CREATE INDEX IF NOT EXISTS idx_events_run ON events(run_id);
    CREATE INDEX IF NOT EXISTS idx_events_step ON events(step_id);
    CREATE INDEX IF NOT EXISTS idx_artifacts_run ON artifacts(run_id);
  `);
  sqlite.close();
}
