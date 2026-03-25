# MultiverseOS MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the MultiverseOS MVP — a local-first experiment management layer for Claude Code that automatically collects development events via hooks and organizes them into Verses (experiment recipes bound to git branches) with a Timeline UI.

**Architecture:** TypeScript monorepo (pnpm workspaces) with 4 packages: `core` (data models + SQLite storage + ingest engine), `hooks` (Claude Code hook scripts), `cli` (the `verse` command), and `ui` (React SPA). A single local HTTP server (`verse serve`) handles event ingestion from hooks and serves the UI.

**Tech Stack:** TypeScript, pnpm, better-sqlite3, drizzle-orm, Hono, commander, Vite, React, TailwindCSS, ulid, zod, vitest

---

## Task 1: Monorepo Scaffolding

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/cli/package.json`
- Create: `packages/cli/tsconfig.json`
- Create: `packages/hooks/package.json`
- Create: `packages/hooks/tsconfig.json`
- Create: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`

**Step 1: Create root package.json and workspace config**

```json
// package.json
{
  "name": "multiverseos",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "dev": "pnpm -r --parallel dev"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  }
}
```

```yaml
# pnpm-workspace.yaml
packages:
  - "packages/*"
```

**Step 2: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

**Step 3: Create .gitignore**

```
node_modules/
dist/
*.db
*.db-journal
.multiverseos/
artifacts/
buffer.jsonl
.env
```

**Step 4: Create packages/core scaffolding**

```json
// packages/core/package.json
{
  "name": "@multiverseos/core",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "better-sqlite3": "^11.0.0",
    "drizzle-orm": "^0.38.0",
    "ulid": "^2.3.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "drizzle-kit": "^0.30.0",
    "vitest": "^3.0.0"
  }
}
```

```json
// packages/core/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
```

**Step 5: Create packages/hooks scaffolding**

```json
// packages/hooks/package.json
{
  "name": "@multiverseos/hooks",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "test": "vitest run"
  },
  "dependencies": {
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "vitest": "^3.0.0"
  }
}
```

```json
// packages/hooks/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
```

**Step 6: Create packages/cli scaffolding**

```json
// packages/cli/package.json
{
  "name": "@multiverseos/cli",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "verse": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "@multiverseos/core": "workspace:*",
    "commander": "^13.0.0",
    "chalk": "^5.4.0"
  },
  "devDependencies": {
    "vitest": "^3.0.0"
  }
}
```

```json
// packages/cli/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
```

**Step 7: Create packages/ui scaffolding (Vite)**

This will be scaffolded later via `pnpm create vite` in Task 13. For now create a placeholder:

```json
// packages/ui/package.json
{
  "name": "@multiverseos/ui",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "echo 'UI not yet scaffolded'",
    "build": "echo 'UI not yet scaffolded'"
  }
}
```

**Step 8: Install dependencies and verify**

Run: `pnpm install`
Expected: lockfile created, all packages resolved

**Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold pnpm monorepo with core/hooks/cli/ui packages"
```

---

## Task 2: Core — Database Schema (Drizzle)

**Files:**
- Create: `packages/core/src/schema.ts`
- Create: `packages/core/src/db.ts`
- Test: `packages/core/src/schema.test.ts`

**Step 1: Write the failing test**

```typescript
// packages/core/src/schema.test.ts
import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { sql } from "drizzle-orm";
import * as schema from "./schema.js";

describe("schema", () => {
  it("creates all tables without error", () => {
    const sqlite = new Database(":memory:");
    const db = drizzle(sqlite, { schema });

    // Push schema to DB (creates tables)
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS verses (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        parent_id TEXT,
        git_branch TEXT NOT NULL,
        fork_from_commit TEXT,
        config TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY,
        verse_id TEXT,
        repo_commit TEXT,
        git_branch TEXT,
        worktree_path TEXT,
        claude_session_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'running',
        started_at TEXT NOT NULL,
        ended_at TEXT,
        total_cost_usd REAL,
        total_tokens INTEGER
      );
      CREATE TABLE IF NOT EXISTS steps (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        seq INTEGER NOT NULL,
        kind TEXT NOT NULL,
        tool_name TEXT,
        summary TEXT NOT NULL DEFAULT '',
        started_at TEXT NOT NULL,
        ended_at TEXT,
        cost_usd REAL,
        tokens INTEGER
      );
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        step_id TEXT,
        ts TEXT NOT NULL,
        source TEXT NOT NULL,
        type TEXT NOT NULL,
        attrs TEXT NOT NULL DEFAULT '{}',
        payload_ref TEXT
      );
      CREATE TABLE IF NOT EXISTS artifacts (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        step_id TEXT,
        type TEXT NOT NULL,
        path TEXT NOT NULL,
        hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        meta TEXT
      );
    `);

    // Verify tables exist
    const tables = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain("verses");
    expect(tableNames).toContain("runs");
    expect(tableNames).toContain("steps");
    expect(tableNames).toContain("events");
    expect(tableNames).toContain("artifacts");

    sqlite.close();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/core && pnpm vitest run src/schema.test.ts`
Expected: FAIL — `schema.js` module not found

**Step 3: Write schema.ts**

```typescript
// packages/core/src/schema.ts
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const verses = sqliteTable("verses", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  parentId: text("parent_id"),
  gitBranch: text("git_branch").notNull(),
  forkFromCommit: text("fork_from_commit"),
  config: text("config").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
});

export const runs = sqliteTable("runs", {
  id: text("id").primaryKey(),
  verseId: text("verse_id"),
  repoCommit: text("repo_commit"),
  gitBranch: text("git_branch"),
  worktreePath: text("worktree_path"),
  claudeSessionId: text("claude_session_id").notNull(),
  status: text("status").notNull().default("running"),
  startedAt: text("started_at").notNull(),
  endedAt: text("ended_at"),
  totalCostUsd: real("total_cost_usd"),
  totalTokens: integer("total_tokens"),
});

export const steps = sqliteTable("steps", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull(),
  seq: integer("seq").notNull(),
  kind: text("kind").notNull(),
  toolName: text("tool_name"),
  summary: text("summary").notNull().default(""),
  startedAt: text("started_at").notNull(),
  endedAt: text("ended_at"),
  costUsd: real("cost_usd"),
  tokens: integer("tokens"),
});

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull(),
  stepId: text("step_id"),
  ts: text("ts").notNull(),
  source: text("source").notNull(),
  type: text("type").notNull(),
  attrs: text("attrs").notNull().default("{}"),
  payloadRef: text("payload_ref"),
});

export const artifacts = sqliteTable("artifacts", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull(),
  stepId: text("step_id"),
  type: text("type").notNull(),
  path: text("path").notNull(),
  hash: text("hash").notNull(),
  createdAt: text("created_at").notNull(),
  meta: text("meta"),
});
```

**Step 4: Write db.ts**

```typescript
// packages/core/src/db.ts
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

/** Create all tables. Idempotent. */
export function migrateDb(dbPath: string) {
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS verses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      parent_id TEXT,
      git_branch TEXT NOT NULL,
      fork_from_commit TEXT,
      config TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      verse_id TEXT,
      repo_commit TEXT,
      git_branch TEXT,
      worktree_path TEXT,
      claude_session_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'running',
      started_at TEXT NOT NULL,
      ended_at TEXT,
      total_cost_usd REAL,
      total_tokens INTEGER
    );
    CREATE TABLE IF NOT EXISTS steps (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      seq INTEGER NOT NULL,
      kind TEXT NOT NULL,
      tool_name TEXT,
      summary TEXT NOT NULL DEFAULT '',
      started_at TEXT NOT NULL,
      ended_at TEXT,
      cost_usd REAL,
      tokens INTEGER
    );
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      step_id TEXT,
      ts TEXT NOT NULL,
      source TEXT NOT NULL,
      type TEXT NOT NULL,
      attrs TEXT NOT NULL DEFAULT '{}',
      payload_ref TEXT
    );
    CREATE TABLE IF NOT EXISTS artifacts (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      step_id TEXT,
      type TEXT NOT NULL,
      path TEXT NOT NULL,
      hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      meta TEXT
    );
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
```

**Step 5: Update test to use db.ts and verify**

Replace the test's manual SQL with `migrateDb` and `createDb`:

```typescript
// packages/core/src/schema.test.ts
import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { migrateDb, createDb } from "./db.js";
import Database from "better-sqlite3";

describe("schema", () => {
  const tmpDirs: string[] = [];

  function makeTempDb(): string {
    const dir = mkdtempSync(join(tmpdir(), "mvos-test-"));
    tmpDirs.push(dir);
    return join(dir, "test.db");
  }

  afterEach(() => {
    tmpDirs.forEach((d) => rmSync(d, { recursive: true, force: true }));
    tmpDirs.length = 0;
  });

  it("migrateDb creates all 5 tables", () => {
    const dbPath = makeTempDb();
    migrateDb(dbPath);

    const sqlite = new Database(dbPath);
    const tables = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];
    const names = tables.map((t) => t.name);

    expect(names).toContain("verses");
    expect(names).toContain("runs");
    expect(names).toContain("steps");
    expect(names).toContain("events");
    expect(names).toContain("artifacts");

    sqlite.close();
  });

  it("migrateDb is idempotent", () => {
    const dbPath = makeTempDb();
    migrateDb(dbPath);
    migrateDb(dbPath); // should not throw
  });

  it("createDb returns a drizzle instance", () => {
    const dbPath = makeTempDb();
    migrateDb(dbPath);
    const db = createDb(dbPath);
    expect(db).toBeDefined();
  });
});
```

**Step 6: Run test to verify it passes**

Run: `cd packages/core && pnpm vitest run src/schema.test.ts`
Expected: 3 tests PASS

**Step 7: Commit**

```bash
git add packages/core/src/schema.ts packages/core/src/db.ts packages/core/src/schema.test.ts
git commit -m "feat(core): add database schema and migration for all 5 tables"
```

---

## Task 3: Core — Store Layer

**Files:**
- Create: `packages/core/src/store/verse-store.ts`
- Create: `packages/core/src/store/run-store.ts`
- Create: `packages/core/src/store/event-store.ts`
- Create: `packages/core/src/store/index.ts`
- Create: `packages/core/src/id.ts`
- Test: `packages/core/src/store/verse-store.test.ts`
- Test: `packages/core/src/store/run-store.test.ts`
- Test: `packages/core/src/store/event-store.test.ts`

**Step 1: Write id.ts utility**

```typescript
// packages/core/src/id.ts
import { ulid } from "ulid";

export const newVerseId = () => `verse_${ulid()}`;
export const newRunId = () => `run_${ulid()}`;
export const newStepId = () => `step_${ulid()}`;
export const newEventId = () => `evt_${ulid()}`;
export const newArtifactId = () => `art_${ulid()}`;
```

**Step 2: Write failing test for verse-store**

```typescript
// packages/core/src/store/verse-store.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { VerseStore } from "./verse-store.js";
import { createTestDb } from "../test-utils.js";
import type { DB } from "../db.js";

describe("VerseStore", () => {
  let db: DB;
  let store: VerseStore;

  beforeEach(() => {
    db = createTestDb();
    store = new VerseStore(db);
  });

  it("creates and retrieves a verse", () => {
    const verse = store.create({
      name: "test-verse",
      gitBranch: "feat/test",
      config: { model: "claude-sonnet-4-6" },
    });

    expect(verse.id).toMatch(/^verse_/);
    expect(verse.name).toBe("test-verse");
    expect(verse.gitBranch).toBe("feat/test");

    const found = store.getById(verse.id);
    expect(found).toEqual(verse);
  });

  it("lists all verses", () => {
    store.create({ name: "a", gitBranch: "a", config: {} });
    store.create({ name: "b", gitBranch: "b", config: {} });
    expect(store.list()).toHaveLength(2);
  });

  it("finds verse by git branch", () => {
    store.create({ name: "x", gitBranch: "feat/x", config: {} });
    const found = store.getByBranch("feat/x");
    expect(found?.name).toBe("x");
  });

  it("rejects duplicate names", () => {
    store.create({ name: "dup", gitBranch: "a", config: {} });
    expect(() => store.create({ name: "dup", gitBranch: "b", config: {} })).toThrow();
  });
});
```

**Step 3: Create test-utils.ts**

```typescript
// packages/core/src/test-utils.ts
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";

/** Create an in-memory DB with all tables for testing. */
export function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.exec(`
    CREATE TABLE verses (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, parent_id TEXT, git_branch TEXT NOT NULL, fork_from_commit TEXT, config TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL);
    CREATE TABLE runs (id TEXT PRIMARY KEY, verse_id TEXT, repo_commit TEXT, git_branch TEXT, worktree_path TEXT, claude_session_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'running', started_at TEXT NOT NULL, ended_at TEXT, total_cost_usd REAL, total_tokens INTEGER);
    CREATE TABLE steps (id TEXT PRIMARY KEY, run_id TEXT NOT NULL, seq INTEGER NOT NULL, kind TEXT NOT NULL, tool_name TEXT, summary TEXT NOT NULL DEFAULT '', started_at TEXT NOT NULL, ended_at TEXT, cost_usd REAL, tokens INTEGER);
    CREATE TABLE events (id TEXT PRIMARY KEY, run_id TEXT NOT NULL, step_id TEXT, ts TEXT NOT NULL, source TEXT NOT NULL, type TEXT NOT NULL, attrs TEXT NOT NULL DEFAULT '{}', payload_ref TEXT);
    CREATE TABLE artifacts (id TEXT PRIMARY KEY, run_id TEXT NOT NULL, step_id TEXT, type TEXT NOT NULL, path TEXT NOT NULL, hash TEXT NOT NULL, created_at TEXT NOT NULL, meta TEXT);
    CREATE INDEX idx_runs_verse ON runs(verse_id);
    CREATE INDEX idx_runs_session ON runs(claude_session_id);
    CREATE INDEX idx_runs_branch ON runs(git_branch);
    CREATE INDEX idx_steps_run ON steps(run_id);
    CREATE INDEX idx_events_run ON events(run_id);
    CREATE INDEX idx_events_step ON events(step_id);
  `);
  return drizzle(sqlite, { schema });
}
```

**Step 4: Run test to verify it fails**

Run: `cd packages/core && pnpm vitest run src/store/verse-store.test.ts`
Expected: FAIL — `verse-store.js` not found

**Step 5: Implement verse-store.ts**

```typescript
// packages/core/src/store/verse-store.ts
import { eq } from "drizzle-orm";
import { verses } from "../schema.js";
import { newVerseId } from "../id.js";
import type { DB } from "../db.js";

export interface CreateVerseInput {
  name: string;
  gitBranch: string;
  config: Record<string, unknown>;
  parentId?: string;
  forkFromCommit?: string;
}

export interface Verse {
  id: string;
  name: string;
  parentId: string | null;
  gitBranch: string;
  forkFromCommit: string | null;
  config: Record<string, unknown>;
  createdAt: string;
}

function rowToVerse(row: typeof verses.$inferSelect): Verse {
  return {
    ...row,
    config: JSON.parse(row.config),
  };
}

export class VerseStore {
  constructor(private db: DB) {}

  create(input: CreateVerseInput): Verse {
    const id = newVerseId();
    const now = new Date().toISOString();
    const row = {
      id,
      name: input.name,
      parentId: input.parentId ?? null,
      gitBranch: input.gitBranch,
      forkFromCommit: input.forkFromCommit ?? null,
      config: JSON.stringify(input.config),
      createdAt: now,
    };
    this.db.insert(verses).values(row).run();
    return rowToVerse(row);
  }

  getById(id: string): Verse | undefined {
    const row = this.db.select().from(verses).where(eq(verses.id, id)).get();
    return row ? rowToVerse(row) : undefined;
  }

  getByName(name: string): Verse | undefined {
    const row = this.db.select().from(verses).where(eq(verses.name, name)).get();
    return row ? rowToVerse(row) : undefined;
  }

  getByBranch(branch: string): Verse | undefined {
    const row = this.db.select().from(verses).where(eq(verses.gitBranch, branch)).get();
    return row ? rowToVerse(row) : undefined;
  }

  list(): Verse[] {
    return this.db.select().from(verses).all().map(rowToVerse);
  }
}
```

**Step 6: Run test to verify it passes**

Run: `cd packages/core && pnpm vitest run src/store/verse-store.test.ts`
Expected: 4 tests PASS

**Step 7: Write failing test for run-store**

```typescript
// packages/core/src/store/run-store.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { RunStore } from "./run-store.js";
import { createTestDb } from "../test-utils.js";
import type { DB } from "../db.js";

describe("RunStore", () => {
  let db: DB;
  let store: RunStore;

  beforeEach(() => {
    db = createTestDb();
    store = new RunStore(db);
  });

  it("creates a run from session_id", () => {
    const run = store.findOrCreate({ claudeSessionId: "sess-1", gitBranch: "main" });
    expect(run.id).toMatch(/^run_/);
    expect(run.claudeSessionId).toBe("sess-1");
    expect(run.status).toBe("running");
  });

  it("returns existing run for same session_id", () => {
    const r1 = store.findOrCreate({ claudeSessionId: "sess-1", gitBranch: "main" });
    const r2 = store.findOrCreate({ claudeSessionId: "sess-1", gitBranch: "main" });
    expect(r1.id).toBe(r2.id);
  });

  it("ends a run", () => {
    const run = store.findOrCreate({ claudeSessionId: "sess-1", gitBranch: "main" });
    store.end(run.id, { totalCostUsd: 1.5, totalTokens: 5000 });
    const updated = store.getById(run.id);
    expect(updated?.status).toBe("completed");
    expect(updated?.totalCostUsd).toBe(1.5);
  });

  it("lists runs by verse_id", () => {
    const r = store.findOrCreate({ claudeSessionId: "s1", gitBranch: "main", verseId: "v1" });
    store.findOrCreate({ claudeSessionId: "s2", gitBranch: "dev" });
    expect(store.listByVerse("v1")).toHaveLength(1);
  });

  it("binds a run to a verse", () => {
    const r = store.findOrCreate({ claudeSessionId: "s1", gitBranch: "main" });
    store.bindVerse(r.id, "v1");
    expect(store.getById(r.id)?.verseId).toBe("v1");
  });
});
```

**Step 8: Implement run-store.ts**

```typescript
// packages/core/src/store/run-store.ts
import { eq, and } from "drizzle-orm";
import { runs } from "../schema.js";
import { newRunId } from "../id.js";
import type { DB } from "../db.js";

export interface FindOrCreateRunInput {
  claudeSessionId: string;
  gitBranch?: string;
  verseId?: string;
  repoCommit?: string;
  worktreePath?: string;
}

export interface Run {
  id: string;
  verseId: string | null;
  repoCommit: string | null;
  gitBranch: string | null;
  worktreePath: string | null;
  claudeSessionId: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  totalCostUsd: number | null;
  totalTokens: number | null;
}

export class RunStore {
  constructor(private db: DB) {}

  findOrCreate(input: FindOrCreateRunInput): Run {
    const existing = this.db
      .select()
      .from(runs)
      .where(
        and(
          eq(runs.claudeSessionId, input.claudeSessionId),
          eq(runs.status, "running")
        )
      )
      .get();

    if (existing) return existing;

    const id = newRunId();
    const row: typeof runs.$inferInsert = {
      id,
      verseId: input.verseId ?? null,
      repoCommit: input.repoCommit ?? null,
      gitBranch: input.gitBranch ?? null,
      worktreePath: input.worktreePath ?? null,
      claudeSessionId: input.claudeSessionId,
      status: "running",
      startedAt: new Date().toISOString(),
      endedAt: null,
      totalCostUsd: null,
      totalTokens: null,
    };
    this.db.insert(runs).values(row).run();
    return row as Run;
  }

  getById(id: string): Run | undefined {
    return this.db.select().from(runs).where(eq(runs.id, id)).get();
  }

  end(id: string, stats?: { totalCostUsd?: number; totalTokens?: number }) {
    this.db
      .update(runs)
      .set({
        status: "completed",
        endedAt: new Date().toISOString(),
        totalCostUsd: stats?.totalCostUsd,
        totalTokens: stats?.totalTokens,
      })
      .where(eq(runs.id, id))
      .run();
  }

  bindVerse(runId: string, verseId: string) {
    this.db.update(runs).set({ verseId }).where(eq(runs.id, runId)).run();
  }

  listByVerse(verseId: string): Run[] {
    return this.db.select().from(runs).where(eq(runs.verseId, verseId)).all();
  }

  listAll(): Run[] {
    return this.db.select().from(runs).all();
  }
}
```

**Step 9: Run run-store test**

Run: `cd packages/core && pnpm vitest run src/store/run-store.test.ts`
Expected: 5 tests PASS

**Step 10: Write failing test for event-store**

```typescript
// packages/core/src/store/event-store.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { EventStore } from "./event-store.js";
import { createTestDb } from "../test-utils.js";
import type { DB } from "../db.js";

describe("EventStore", () => {
  let db: DB;
  let store: EventStore;

  beforeEach(() => {
    db = createTestDb();
    store = new EventStore(db);
  });

  it("inserts and retrieves events for a run", () => {
    store.insert({
      runId: "run_1",
      source: "hook",
      type: "PreToolUse",
      attrs: { tool_name: "Bash" },
    });
    store.insert({
      runId: "run_1",
      source: "hook",
      type: "PostToolUse",
      attrs: { tool_name: "Bash" },
    });

    const events = store.listByRun("run_1");
    expect(events).toHaveLength(2);
    expect(events[0].type).toBe("PreToolUse");
  });

  it("inserts step and links events", () => {
    const stepId = store.insertStep({
      runId: "run_1",
      seq: 1,
      kind: "tool_call",
      toolName: "Bash",
      summary: "npm test",
    });

    store.insert({
      runId: "run_1",
      stepId,
      source: "hook",
      type: "PostToolUse",
      attrs: {},
    });

    const events = store.listByStep(stepId);
    expect(events).toHaveLength(1);
  });

  it("lists steps for a run", () => {
    store.insertStep({ runId: "r1", seq: 1, kind: "tool_call", summary: "a" });
    store.insertStep({ runId: "r1", seq: 2, kind: "file_edit", summary: "b" });
    const s = store.listStepsByRun("r1");
    expect(s).toHaveLength(2);
    expect(s[0].seq).toBe(1);
  });
});
```

**Step 11: Implement event-store.ts**

```typescript
// packages/core/src/store/event-store.ts
import { eq, asc } from "drizzle-orm";
import { events, steps } from "../schema.js";
import { newEventId, newStepId } from "../id.js";
import type { DB } from "../db.js";

export interface InsertEventInput {
  runId: string;
  stepId?: string;
  source: string;
  type: string;
  attrs: Record<string, unknown>;
  payloadRef?: string;
}

export interface InsertStepInput {
  runId: string;
  seq: number;
  kind: string;
  toolName?: string;
  summary: string;
}

export class EventStore {
  constructor(private db: DB) {}

  insert(input: InsertEventInput): string {
    const id = newEventId();
    this.db
      .insert(events)
      .values({
        id,
        runId: input.runId,
        stepId: input.stepId ?? null,
        ts: new Date().toISOString(),
        source: input.source,
        type: input.type,
        attrs: JSON.stringify(input.attrs),
        payloadRef: input.payloadRef ?? null,
      })
      .run();
    return id;
  }

  insertStep(input: InsertStepInput): string {
    const id = newStepId();
    this.db
      .insert(steps)
      .values({
        id,
        runId: input.runId,
        seq: input.seq,
        kind: input.kind,
        toolName: input.toolName ?? null,
        summary: input.summary,
        startedAt: new Date().toISOString(),
        endedAt: null,
        costUsd: null,
        tokens: null,
      })
      .run();
    return id;
  }

  endStep(stepId: string, data?: { costUsd?: number; tokens?: number }) {
    this.db
      .update(steps)
      .set({
        endedAt: new Date().toISOString(),
        costUsd: data?.costUsd,
        tokens: data?.tokens,
      })
      .where(eq(steps.id, stepId))
      .run();
  }

  listByRun(runId: string) {
    return this.db
      .select()
      .from(events)
      .where(eq(events.runId, runId))
      .orderBy(asc(events.ts))
      .all()
      .map((e) => ({ ...e, attrs: JSON.parse(e.attrs) }));
  }

  listByStep(stepId: string) {
    return this.db
      .select()
      .from(events)
      .where(eq(events.stepId, stepId))
      .orderBy(asc(events.ts))
      .all()
      .map((e) => ({ ...e, attrs: JSON.parse(e.attrs) }));
  }

  listStepsByRun(runId: string) {
    return this.db
      .select()
      .from(steps)
      .where(eq(steps.runId, runId))
      .orderBy(asc(steps.seq))
      .all();
  }
}
```

**Step 12: Run event-store test**

Run: `cd packages/core && pnpm vitest run src/store/event-store.test.ts`
Expected: 3 tests PASS

**Step 13: Create store/index.ts and core index.ts**

```typescript
// packages/core/src/store/index.ts
export { VerseStore } from "./verse-store.js";
export type { Verse, CreateVerseInput } from "./verse-store.js";
export { RunStore } from "./run-store.js";
export type { Run, FindOrCreateRunInput } from "./run-store.js";
export { EventStore } from "./event-store.js";
export type { InsertEventInput, InsertStepInput } from "./event-store.js";
```

```typescript
// packages/core/src/index.ts
export * from "./schema.js";
export * from "./db.js";
export * from "./id.js";
export * from "./store/index.js";
```

**Step 14: Run all core tests**

Run: `cd packages/core && pnpm vitest run`
Expected: All tests PASS

**Step 15: Commit**

```bash
git add packages/core/src/
git commit -m "feat(core): add store layer with Verse, Run, Event CRUD operations"
```

---

## Task 4: Core — Ingest Engine

**Files:**
- Create: `packages/core/src/engine/ingest.ts`
- Create: `packages/core/src/engine/index.ts`
- Test: `packages/core/src/engine/ingest.test.ts`

**Step 1: Write failing test**

```typescript
// packages/core/src/engine/ingest.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { IngestEngine } from "./ingest.js";
import { VerseStore, RunStore, EventStore } from "../store/index.js";
import { createTestDb } from "../test-utils.js";
import type { DB } from "../db.js";

describe("IngestEngine", () => {
  let db: DB;
  let engine: IngestEngine;

  beforeEach(() => {
    db = createTestDb();
    engine = new IngestEngine(
      new VerseStore(db),
      new RunStore(db),
      new EventStore(db)
    );
  });

  it("auto-creates a run on first event for a session", () => {
    engine.ingest({
      session_id: "sess-1",
      cwd: "/repo",
      type: "PreToolUse",
      tool_name: "Bash",
      tool_input: { command: "npm test" },
    });

    const runs = engine.runStore.listAll();
    expect(runs).toHaveLength(1);
    expect(runs[0].claudeSessionId).toBe("sess-1");
  });

  it("reuses run for same session_id", () => {
    engine.ingest({ session_id: "s1", cwd: "/r", type: "PreToolUse", tool_name: "Read" });
    engine.ingest({ session_id: "s1", cwd: "/r", type: "PostToolUse", tool_name: "Read" });

    expect(engine.runStore.listAll()).toHaveLength(1);
    expect(engine.eventStore.listByRun(engine.runStore.listAll()[0].id)).toHaveLength(2);
  });

  it("associates run with verse by git branch", () => {
    engine.verseStore.create({ name: "v1", gitBranch: "feat/x", config: {} });
    engine.ingest({
      session_id: "s1",
      cwd: "/r",
      type: "PreToolUse",
      tool_name: "Bash",
      git_branch: "feat/x",
    });

    const run = engine.runStore.listAll()[0];
    expect(run.verseId).toMatch(/^verse_/);
  });

  it("creates step for PreToolUse + PostToolUse pair", () => {
    engine.ingest({ session_id: "s1", cwd: "/r", type: "PreToolUse", tool_name: "Edit", tool_input: { file_path: "a.ts" } });
    engine.ingest({ session_id: "s1", cwd: "/r", type: "PostToolUse", tool_name: "Edit" });

    const run = engine.runStore.listAll()[0];
    const steps = engine.eventStore.listStepsByRun(run.id);
    expect(steps).toHaveLength(1);
    expect(steps[0].toolName).toBe("Edit");
  });

  it("handles Stop event by ending the run", () => {
    engine.ingest({ session_id: "s1", cwd: "/r", type: "PreToolUse", tool_name: "Bash" });
    engine.ingest({ session_id: "s1", cwd: "/r", type: "Stop" });

    const run = engine.runStore.listAll()[0];
    expect(run.status).toBe("completed");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/core && pnpm vitest run src/engine/ingest.test.ts`
Expected: FAIL — module not found

**Step 3: Implement ingest.ts**

```typescript
// packages/core/src/engine/ingest.ts
import { VerseStore } from "../store/verse-store.js";
import { RunStore } from "../store/run-store.js";
import { EventStore } from "../store/event-store.js";

export interface HookEvent {
  session_id: string;
  cwd: string;
  type: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  result?: unknown;
  git_branch?: string;
  transcript_path?: string;
  [key: string]: unknown;
}

export class IngestEngine {
  /** Track current step per run for Pre/Post pairing */
  private activeSteps = new Map<string, string>();
  /** Track step sequence per run */
  private stepSeqs = new Map<string, number>();

  constructor(
    public verseStore: VerseStore,
    public runStore: RunStore,
    public eventStore: EventStore
  ) {}

  ingest(event: HookEvent): void {
    // 1. Find or create run
    const run = this.runStore.findOrCreate({
      claudeSessionId: event.session_id,
      gitBranch: event.git_branch,
    });

    // 2. Auto-associate verse by git branch (on first event only)
    if (!run.verseId && event.git_branch) {
      const verse = this.verseStore.getByBranch(event.git_branch);
      if (verse) {
        this.runStore.bindVerse(run.id, verse.id);
        run.verseId = verse.id;
      }
    }

    // 3. Handle Stop event
    if (event.type === "Stop") {
      this.runStore.end(run.id);
      this.eventStore.insert({
        runId: run.id,
        source: "hook",
        type: "Stop",
        attrs: { cwd: event.cwd },
      });
      return;
    }

    // 4. Handle PreToolUse — create a step
    let stepId: string | undefined;
    if (event.type === "PreToolUse" && event.tool_name) {
      const seq = (this.stepSeqs.get(run.id) ?? 0) + 1;
      this.stepSeqs.set(run.id, seq);

      const summary = this.buildSummary(event);
      stepId = this.eventStore.insertStep({
        runId: run.id,
        seq,
        kind: this.classifyKind(event.tool_name),
        toolName: event.tool_name,
        summary,
      });
      this.activeSteps.set(run.id, stepId);
    }

    // 5. Handle PostToolUse — close the active step
    if (event.type === "PostToolUse") {
      stepId = this.activeSteps.get(run.id);
      if (stepId) {
        this.eventStore.endStep(stepId);
        this.activeSteps.delete(run.id);
      }
    }

    // 6. Insert event
    this.eventStore.insert({
      runId: run.id,
      stepId,
      source: "hook",
      type: event.type,
      attrs: {
        tool_name: event.tool_name,
        tool_input: event.tool_input,
        result: event.result,
        cwd: event.cwd,
      },
    });
  }

  private classifyKind(toolName: string): string {
    if (["Edit", "Write"].includes(toolName)) return "file_edit";
    if (["Bash"].includes(toolName)) return "tool_call";
    if (["Read", "Glob", "Grep"].includes(toolName)) return "tool_call";
    if (toolName === "Agent") return "subagent";
    return "tool_call";
  }

  private buildSummary(event: HookEvent): string {
    const tool = event.tool_name ?? "unknown";
    const input = event.tool_input;
    if (!input) return tool;

    if (tool === "Bash" && typeof input.command === "string") {
      return `${tool}: ${input.command.slice(0, 80)}`;
    }
    if ((tool === "Edit" || tool === "Write" || tool === "Read") && typeof input.file_path === "string") {
      return `${tool} ${input.file_path}`;
    }
    if (tool === "Grep" && typeof input.pattern === "string") {
      return `${tool} "${input.pattern}"`;
    }
    return tool;
  }
}
```

```typescript
// packages/core/src/engine/index.ts
export { IngestEngine } from "./ingest.js";
export type { HookEvent } from "./ingest.js";
```

**Step 4: Update core index.ts**

Add to `packages/core/src/index.ts`:
```typescript
export * from "./engine/index.js";
```

**Step 5: Run test to verify it passes**

Run: `cd packages/core && pnpm vitest run src/engine/ingest.test.ts`
Expected: 5 tests PASS

**Step 6: Run all core tests**

Run: `cd packages/core && pnpm vitest run`
Expected: All tests PASS

**Step 7: Commit**

```bash
git add packages/core/src/engine/
git commit -m "feat(core): add IngestEngine for auto run creation and event processing"
```

---

## Task 5: Hooks — Claude Code Hook Scripts

**Files:**
- Create: `packages/hooks/src/ingest-client.ts`
- Create: `packages/hooks/src/pre-tool-use.ts`
- Create: `packages/hooks/src/post-tool-use.ts`
- Create: `packages/hooks/src/notification.ts`
- Create: `packages/hooks/src/stop.ts`
- Create: `packages/hooks/src/common.ts`
- Test: `packages/hooks/src/common.test.ts`

**Step 1: Write failing test for common utilities**

```typescript
// packages/hooks/src/common.test.ts
import { describe, it, expect } from "vitest";
import { readStdin, buildPayload } from "./common.js";

describe("common", () => {
  it("buildPayload constructs event from hook stdin data", () => {
    const stdin = {
      session_id: "sess-1",
      cwd: "/repo",
      tool_name: "Bash",
      tool_input: { command: "npm test" },
    };
    const payload = buildPayload("PreToolUse", stdin);

    expect(payload.session_id).toBe("sess-1");
    expect(payload.type).toBe("PreToolUse");
    expect(payload.tool_name).toBe("Bash");
  });
});
```

**Step 2: Implement common.ts**

```typescript
// packages/hooks/src/common.ts

export interface HookStdinData {
  session_id?: string;
  cwd?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  result?: unknown;
  transcript_path?: string;
  [key: string]: unknown;
}

export interface EventPayload {
  session_id: string;
  cwd: string;
  type: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  result?: unknown;
  transcript_path?: string;
  git_branch?: string;
}

export async function readStdin(): Promise<HookStdinData> {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
    // Timeout after 1s to avoid hanging
    setTimeout(() => resolve({}), 1000);
  });
}

export function buildPayload(type: string, stdin: HookStdinData): EventPayload {
  return {
    session_id: stdin.session_id ?? "unknown",
    cwd: stdin.cwd ?? process.cwd(),
    type,
    tool_name: stdin.tool_name,
    tool_input: stdin.tool_input,
    result: stdin.result,
    transcript_path: stdin.transcript_path,
  };
}

const INGEST_URL = process.env.VERSE_INGEST_URL ?? "http://127.0.0.1:7777/api/events";
const BUFFER_PATH = (() => {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? "/tmp";
  return `${home}/.multiverseos/buffer.jsonl`;
})();

export async function sendEvent(payload: EventPayload): Promise<void> {
  try {
    const resp = await fetch(INGEST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(2000),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  } catch {
    // Offline fallback: append to buffer file
    const { appendFileSync, mkdirSync } = await import("node:fs");
    const { dirname } = await import("node:path");
    try {
      mkdirSync(dirname(BUFFER_PATH), { recursive: true });
      appendFileSync(BUFFER_PATH, JSON.stringify(payload) + "\n");
    } catch {
      // Silently fail — do not break Claude Code
    }
  }
}

/** Detect current git branch from cwd */
export async function getGitBranch(cwd: string): Promise<string | undefined> {
  try {
    const { execSync } = await import("node:child_process");
    return execSync("git rev-parse --abbrev-ref HEAD", { cwd, encoding: "utf8" }).trim();
  } catch {
    return undefined;
  }
}
```

**Step 3: Run test**

Run: `cd packages/hooks && pnpm vitest run src/common.test.ts`
Expected: PASS

**Step 4: Create hook scripts**

```typescript
// packages/hooks/src/pre-tool-use.ts
import { readStdin, buildPayload, sendEvent, getGitBranch } from "./common.js";

const stdin = await readStdin();
const payload = buildPayload("PreToolUse", stdin);
payload.git_branch = await getGitBranch(payload.cwd);
await sendEvent(payload);
```

```typescript
// packages/hooks/src/post-tool-use.ts
import { readStdin, buildPayload, sendEvent, getGitBranch } from "./common.js";

const stdin = await readStdin();
const payload = buildPayload("PostToolUse", stdin);
payload.git_branch = await getGitBranch(payload.cwd);
await sendEvent(payload);
```

```typescript
// packages/hooks/src/notification.ts
import { readStdin, buildPayload, sendEvent } from "./common.js";

const stdin = await readStdin();
const payload = buildPayload("Notification", stdin);
await sendEvent(payload);
```

```typescript
// packages/hooks/src/stop.ts
import { readStdin, buildPayload, sendEvent } from "./common.js";

const stdin = await readStdin();
const payload = buildPayload("Stop", stdin);
await sendEvent(payload);
```

**Step 5: Run all hooks tests**

Run: `cd packages/hooks && pnpm vitest run`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/hooks/src/
git commit -m "feat(hooks): add Claude Code hook scripts with offline buffer fallback"
```

---

## Task 6: CLI — Init & Serve Commands

**Files:**
- Create: `packages/cli/src/index.ts`
- Create: `packages/cli/src/commands/init.ts`
- Create: `packages/cli/src/commands/serve.ts`
- Create: `packages/cli/src/server.ts`

**Step 1: Create CLI entry point**

```typescript
// packages/cli/src/index.ts
#!/usr/bin/env node
import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { serveCommand } from "./commands/serve.js";

const program = new Command();

program
  .name("verse")
  .description("MultiverseOS — experiment management for Claude Code")
  .version("0.1.0");

program.addCommand(initCommand);
program.addCommand(serveCommand);

program.parse();
```

**Step 2: Implement init command**

```typescript
// packages/cli/src/commands/init.ts
import { Command } from "commander";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { migrateDb } from "@multiverseos/core";

export const initCommand = new Command("init")
  .description("Initialize MultiverseOS in the current project")
  .action(() => {
    const projectRoot = process.cwd();
    const dataDir = join(projectRoot, ".multiverseos");
    const artifactsDir = join(dataDir, "artifacts");
    const dbPath = join(dataDir, "multiverseos.db");

    // Create directories
    mkdirSync(artifactsDir, { recursive: true });
    console.log(`Created ${dataDir}`);

    // Migrate database
    migrateDb(dbPath);
    console.log(`Database initialized at ${dbPath}`);

    // Register hooks in user settings
    const claudeSettingsDir = join(
      process.env.HOME ?? process.env.USERPROFILE ?? "",
      ".claude"
    );
    const settingsPath = join(claudeSettingsDir, "settings.json");

    const hooksDir = resolve(join(projectRoot, "node_modules", "@multiverseos", "hooks", "dist"));

    let settings: Record<string, unknown> = {};
    if (existsSync(settingsPath)) {
      try {
        settings = JSON.parse(readFileSync(settingsPath, "utf8"));
      } catch {
        // start fresh
      }
    }

    const hookEntry = (script: string) => ({
      type: "command",
      command: `node ${join(hooksDir, script)}`,
    });

    const hooks = (settings.hooks ?? {}) as Record<string, unknown[]>;
    const hookScripts = {
      PreToolUse: hookEntry("pre-tool-use.js"),
      PostToolUse: hookEntry("post-tool-use.js"),
      Notification: hookEntry("notification.js"),
      Stop: hookEntry("stop.js"),
    };

    for (const [event, entry] of Object.entries(hookScripts)) {
      if (!hooks[event]) hooks[event] = [];
      const arr = hooks[event] as Record<string, unknown>[];
      // Avoid duplicates
      if (!arr.some((h) => h.command === (entry as Record<string, unknown>).command)) {
        arr.push(entry);
      }
    }

    settings.hooks = hooks;
    mkdirSync(claudeSettingsDir, { recursive: true });
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
    console.log(`Hooks registered in ${settingsPath}`);

    console.log("\nMultiverseOS initialized. Run 'verse serve' to start collecting events.");
  });
```

**Step 3: Implement serve command (HTTP server with Hono)**

```typescript
// packages/cli/src/server.ts
import { Hono } from "hono";
import { serve as honoServe } from "@hono/node-server";
import { createDb, migrateDb, VerseStore, RunStore, EventStore, IngestEngine } from "@multiverseos/core";
import type { HookEvent } from "@multiverseos/core";
import { join } from "node:path";

export interface ServerOptions {
  port: number;
  dbPath: string;
}

export function createServer(opts: ServerOptions) {
  migrateDb(opts.dbPath);
  const db = createDb(opts.dbPath);
  const verseStore = new VerseStore(db);
  const runStore = new RunStore(db);
  const eventStore = new EventStore(db);
  const engine = new IngestEngine(verseStore, runStore, eventStore);

  const app = new Hono();

  // Event ingestion
  app.post("/api/events", async (c) => {
    const body = await c.req.json<HookEvent>();
    engine.ingest(body);
    return c.json({ ok: true });
  });

  // Verses
  app.get("/api/verses", (c) => c.json(verseStore.list()));
  app.get("/api/verses/:id", (c) => {
    const verse = verseStore.getById(c.req.param("id")) ?? verseStore.getByName(c.req.param("id"));
    return verse ? c.json(verse) : c.json({ error: "not found" }, 404);
  });
  app.post("/api/verses", async (c) => {
    const body = await c.req.json();
    const verse = verseStore.create(body);
    return c.json(verse, 201);
  });

  // Runs
  app.get("/api/runs", (c) => {
    const verseId = c.req.query("verse_id");
    return c.json(verseId ? runStore.listByVerse(verseId) : runStore.listAll());
  });
  app.get("/api/runs/:id", (c) => {
    const run = runStore.getById(c.req.param("id"));
    return run ? c.json(run) : c.json({ error: "not found" }, 404);
  });
  app.get("/api/runs/:id/events", (c) => {
    return c.json(eventStore.listByRun(c.req.param("id")));
  });
  app.get("/api/runs/:id/timeline", (c) => {
    return c.json(eventStore.listStepsByRun(c.req.param("id")));
  });

  // SSE stream (for live updates)
  app.get("/api/runs/:id/stream", (c) => {
    // Basic SSE — sends a heartbeat; full implementation in later task
    return c.text("data: {\"type\":\"connected\"}\n\n", 200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
  });

  return { app, engine, verseStore, runStore, eventStore };
}

export function startServer(opts: ServerOptions) {
  const { app } = createServer(opts);
  const server = honoServe({ fetch: app.fetch, port: opts.port });
  console.log(`MultiverseOS server listening on http://127.0.0.1:${opts.port}`);
  return server;
}
```

```typescript
// packages/cli/src/commands/serve.ts
import { Command } from "commander";
import { join } from "node:path";
import { startServer } from "../server.js";

export const serveCommand = new Command("serve")
  .description("Start the MultiverseOS local server")
  .option("-p, --port <port>", "Port number", "7777")
  .action((opts) => {
    const dbPath = join(process.cwd(), ".multiverseos", "multiverseos.db");
    startServer({ port: parseInt(opts.port, 10), dbPath });
  });
```

**Step 4: Add hono dependencies to cli**

Add to `packages/cli/package.json` dependencies:
```json
"hono": "^4.7.0",
"@hono/node-server": "^1.14.0"
```

**Step 5: Run pnpm install and build**

Run: `pnpm install && pnpm -r build`
Expected: All packages build successfully

**Step 6: Commit**

```bash
git add packages/cli/src/ packages/cli/package.json
git commit -m "feat(cli): add verse init and verse serve commands"
```

---

## Task 7: CLI — Verse Management Commands

**Files:**
- Create: `packages/cli/src/commands/create.ts`
- Create: `packages/cli/src/commands/list.ts`
- Create: `packages/cli/src/commands/show.ts`
- Create: `packages/cli/src/commands/fork.ts`
- Create: `packages/cli/src/commands/diff.ts`
- Modify: `packages/cli/src/index.ts`

**Step 1: Implement verse create**

```typescript
// packages/cli/src/commands/create.ts
import { Command } from "commander";
import { join } from "node:path";
import { createDb, VerseStore } from "@multiverseos/core";
import { execSync } from "node:child_process";

export const createCommand = new Command("create")
  .description("Create a new verse (experiment recipe + git branch)")
  .argument("<name>", "Verse name")
  .option("--model <model>", "Model name", "claude-sonnet-4-6")
  .option("--branch <branch>", "Git branch name (defaults to verse name)")
  .action((name, opts) => {
    const dbPath = join(process.cwd(), ".multiverseos", "multiverseos.db");
    const db = createDb(dbPath);
    const store = new VerseStore(db);

    const gitBranch = opts.branch ?? name;

    // Create git branch
    try {
      execSync(`git branch ${gitBranch}`, { stdio: "pipe" });
      console.log(`Created git branch: ${gitBranch}`);
    } catch (e: any) {
      if (e.stderr?.toString().includes("already exists")) {
        console.log(`Git branch ${gitBranch} already exists, using it`);
      } else {
        throw e;
      }
    }

    const config = { model: opts.model };
    const verse = store.create({ name, gitBranch, config });
    console.log(`Created verse: ${verse.name} (${verse.id})`);
    console.log(`  Branch: ${verse.gitBranch}`);
    console.log(`  Config: ${JSON.stringify(verse.config, null, 2)}`);
  });
```

**Step 2: Implement verse list**

```typescript
// packages/cli/src/commands/list.ts
import { Command } from "commander";
import { join } from "node:path";
import { createDb, VerseStore, RunStore } from "@multiverseos/core";

export const listCommand = new Command("list")
  .description("List all verses")
  .action(() => {
    const dbPath = join(process.cwd(), ".multiverseos", "multiverseos.db");
    const db = createDb(dbPath);
    const verseStore = new VerseStore(db);
    const runStore = new RunStore(db);

    const verses = verseStore.list();
    if (verses.length === 0) {
      console.log("No verses yet. Create one with: verse create <name>");
      return;
    }

    for (const v of verses) {
      const runs = runStore.listByVerse(v.id);
      const runCount = runs.length;
      console.log(`  ${v.name}`);
      console.log(`    branch: ${v.gitBranch} | runs: ${runCount} | id: ${v.id}`);
    }
  });
```

**Step 3: Implement verse show**

```typescript
// packages/cli/src/commands/show.ts
import { Command } from "commander";
import { join } from "node:path";
import { createDb, VerseStore } from "@multiverseos/core";

export const showCommand = new Command("show")
  .description("Show verse details")
  .argument("<name-or-id>", "Verse name or ID")
  .action((nameOrId) => {
    const dbPath = join(process.cwd(), ".multiverseos", "multiverseos.db");
    const db = createDb(dbPath);
    const store = new VerseStore(db);

    const verse = store.getById(nameOrId) ?? store.getByName(nameOrId);
    if (!verse) {
      console.error(`Verse not found: ${nameOrId}`);
      process.exit(1);
    }

    console.log(`Verse: ${verse.name}`);
    console.log(`  ID: ${verse.id}`);
    console.log(`  Branch: ${verse.gitBranch}`);
    console.log(`  Parent: ${verse.parentId ?? "none"}`);
    console.log(`  Created: ${verse.createdAt}`);
    console.log(`  Config:`);
    console.log(JSON.stringify(verse.config, null, 4));
  });
```

**Step 4: Implement verse fork**

```typescript
// packages/cli/src/commands/fork.ts
import { Command } from "commander";
import { join } from "node:path";
import { createDb, VerseStore } from "@multiverseos/core";
import { execSync } from "node:child_process";

export const forkCommand = new Command("fork")
  .description("Fork a new verse from an existing one at a specific commit")
  .argument("<source>", "Source verse name or ID")
  .argument("<new-name>", "New verse name")
  .option("--at <sha>", "Fork from this commit SHA (defaults to HEAD of source branch)")
  .action((source, newName, opts) => {
    const dbPath = join(process.cwd(), ".multiverseos", "multiverseos.db");
    const db = createDb(dbPath);
    const store = new VerseStore(db);

    const srcVerse = store.getByName(source) ?? store.getById(source);
    if (!srcVerse) {
      console.error(`Source verse not found: ${source}`);
      process.exit(1);
    }

    const forkPoint = opts.at ?? execSync(`git rev-parse ${srcVerse.gitBranch}`, { encoding: "utf8" }).trim();

    // Create git branch from the fork point
    execSync(`git branch ${newName} ${forkPoint}`, { stdio: "pipe" });
    console.log(`Created git branch: ${newName} from ${forkPoint.slice(0, 8)}`);

    const verse = store.create({
      name: newName,
      gitBranch: newName,
      config: srcVerse.config,
      parentId: srcVerse.id,
      forkFromCommit: forkPoint,
    });

    console.log(`Forked verse: ${verse.name} (${verse.id})`);
    console.log(`  From: ${srcVerse.name} @ ${forkPoint.slice(0, 8)}`);
  });
```

**Step 5: Implement verse diff**

```typescript
// packages/cli/src/commands/diff.ts
import { Command } from "commander";
import { join } from "node:path";
import { createDb, VerseStore } from "@multiverseos/core";

export const diffCommand = new Command("diff")
  .description("Compare two verse configs")
  .argument("<a>", "First verse name or ID")
  .argument("<b>", "Second verse name or ID")
  .action((a, b) => {
    const dbPath = join(process.cwd(), ".multiverseos", "multiverseos.db");
    const db = createDb(dbPath);
    const store = new VerseStore(db);

    const va = store.getByName(a) ?? store.getById(a);
    const vb = store.getByName(b) ?? store.getById(b);

    if (!va) { console.error(`Verse not found: ${a}`); process.exit(1); }
    if (!vb) { console.error(`Verse not found: ${b}`); process.exit(1); }

    console.log(`--- ${va.name} (${va.gitBranch})`);
    console.log(`+++ ${vb.name} (${vb.gitBranch})`);
    console.log();

    const keysA = Object.keys(va.config);
    const keysB = Object.keys(vb.config);
    const allKeys = [...new Set([...keysA, ...keysB])];

    for (const key of allKeys) {
      const valA = JSON.stringify((va.config as Record<string, unknown>)[key]);
      const valB = JSON.stringify((vb.config as Record<string, unknown>)[key]);
      if (valA !== valB) {
        if (valA) console.log(`  - ${key}: ${valA}`);
        if (valB) console.log(`  + ${key}: ${valB}`);
      }
    }
  });
```

**Step 6: Register all commands in index.ts**

Update `packages/cli/src/index.ts` to import and add all commands:

```typescript
#!/usr/bin/env node
import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { serveCommand } from "./commands/serve.js";
import { createCommand } from "./commands/create.js";
import { listCommand } from "./commands/list.js";
import { showCommand } from "./commands/show.js";
import { forkCommand } from "./commands/fork.js";
import { diffCommand } from "./commands/diff.js";

const program = new Command();

program
  .name("verse")
  .description("MultiverseOS — experiment management for Claude Code")
  .version("0.1.0");

program.addCommand(initCommand);
program.addCommand(serveCommand);
program.addCommand(createCommand);
program.addCommand(listCommand);
program.addCommand(showCommand);
program.addCommand(forkCommand);
program.addCommand(diffCommand);

program.parse();
```

**Step 7: Build and verify**

Run: `pnpm -r build`
Expected: All packages build

**Step 8: Commit**

```bash
git add packages/cli/src/
git commit -m "feat(cli): add verse create/list/show/fork/diff commands"
```

---

## Task 8: CLI — Run Query Commands

**Files:**
- Create: `packages/cli/src/commands/runs.ts`
- Create: `packages/cli/src/commands/inspect.ts`
- Create: `packages/cli/src/commands/timeline.ts`
- Create: `packages/cli/src/commands/events.ts`
- Create: `packages/cli/src/commands/bind.ts`
- Create: `packages/cli/src/commands/cost.ts`
- Modify: `packages/cli/src/index.ts`

**Step 1: Implement verse runs**

```typescript
// packages/cli/src/commands/runs.ts
import { Command } from "commander";
import { join } from "node:path";
import { createDb, RunStore } from "@multiverseos/core";

export const runsCommand = new Command("runs")
  .description("List runs")
  .option("--verse <id>", "Filter by verse ID or name")
  .action((opts) => {
    const dbPath = join(process.cwd(), ".multiverseos", "multiverseos.db");
    const db = createDb(dbPath);
    const store = new RunStore(db);

    const runs = opts.verse ? store.listByVerse(opts.verse) : store.listAll();

    if (runs.length === 0) {
      console.log("No runs recorded yet.");
      return;
    }

    for (const r of runs) {
      const cost = r.totalCostUsd != null ? `$${r.totalCostUsd.toFixed(2)}` : "-";
      const tokens = r.totalTokens ?? "-";
      console.log(`  ${r.id.slice(0, 16)}...  ${r.status.padEnd(10)} ${cost.padStart(8)}  ${r.startedAt}`);
    }
  });
```

**Step 2: Implement verse inspect**

```typescript
// packages/cli/src/commands/inspect.ts
import { Command } from "commander";
import { join } from "node:path";
import { createDb, RunStore, EventStore, VerseStore } from "@multiverseos/core";

export const inspectCommand = new Command("inspect")
  .description("Show run details")
  .argument("<run-id>", "Run ID")
  .action((runId) => {
    const dbPath = join(process.cwd(), ".multiverseos", "multiverseos.db");
    const db = createDb(dbPath);
    const runStore = new RunStore(db);
    const eventStore = new EventStore(db);
    const verseStore = new VerseStore(db);

    const run = runStore.getById(runId);
    if (!run) { console.error(`Run not found: ${runId}`); process.exit(1); }

    const verse = run.verseId ? verseStore.getById(run.verseId) : null;
    const steps = eventStore.listStepsByRun(run.id);
    const events = eventStore.listByRun(run.id);

    console.log(`Run: ${run.id}`);
    console.log(`  Verse: ${verse?.name ?? "unbound"}`);
    console.log(`  Branch: ${run.gitBranch ?? "-"}`);
    console.log(`  Status: ${run.status}`);
    console.log(`  Started: ${run.startedAt}`);
    console.log(`  Ended: ${run.endedAt ?? "-"}`);
    console.log(`  Cost: ${run.totalCostUsd != null ? "$" + run.totalCostUsd.toFixed(2) : "-"}`);
    console.log(`  Tokens: ${run.totalTokens ?? "-"}`);
    console.log(`  Steps: ${steps.length}`);
    console.log(`  Events: ${events.length}`);
  });
```

**Step 3: Implement verse timeline (terminal)**

```typescript
// packages/cli/src/commands/timeline.ts
import { Command } from "commander";
import { join } from "node:path";
import { createDb, EventStore } from "@multiverseos/core";

export const timelineCommand = new Command("timeline")
  .description("Show run timeline in terminal")
  .argument("<run-id>", "Run ID")
  .action((runId) => {
    const dbPath = join(process.cwd(), ".multiverseos", "multiverseos.db");
    const db = createDb(dbPath);
    const store = new EventStore(db);

    const steps = store.listStepsByRun(runId);
    if (steps.length === 0) {
      console.log("No steps recorded for this run.");
      return;
    }

    for (const step of steps) {
      const time = step.startedAt.split("T")[1]?.slice(0, 8) ?? "";
      const icon = step.kind === "file_edit" ? "E" : step.kind === "subagent" ? "A" : "T";
      const cost = step.costUsd != null ? ` $${step.costUsd.toFixed(3)}` : "";
      console.log(`  ${time}  [${icon}] ${step.summary}${cost}`);
    }
  });
```

**Step 4: Implement verse events**

```typescript
// packages/cli/src/commands/events.ts
import { Command } from "commander";
import { join } from "node:path";
import { createDb, EventStore } from "@multiverseos/core";

export const eventsCommand = new Command("events")
  .description("Show raw events for a run")
  .argument("<run-id>", "Run ID")
  .option("--type <type>", "Filter by event type")
  .action((runId, opts) => {
    const dbPath = join(process.cwd(), ".multiverseos", "multiverseos.db");
    const db = createDb(dbPath);
    const store = new EventStore(db);

    let events = store.listByRun(runId);
    if (opts.type) {
      events = events.filter((e) => e.type === opts.type);
    }

    for (const e of events) {
      console.log(JSON.stringify({ id: e.id, ts: e.ts, type: e.type, attrs: e.attrs }, null, 2));
    }
  });
```

**Step 5: Implement verse bind**

```typescript
// packages/cli/src/commands/bind.ts
import { Command } from "commander";
import { join } from "node:path";
import { createDb, RunStore, VerseStore } from "@multiverseos/core";

export const bindCommand = new Command("bind")
  .description("Bind an orphan run to a verse")
  .argument("<run-id>", "Run ID")
  .argument("<verse>", "Verse name or ID")
  .action((runId, verseName) => {
    const dbPath = join(process.cwd(), ".multiverseos", "multiverseos.db");
    const db = createDb(dbPath);
    const runStore = new RunStore(db);
    const verseStore = new VerseStore(db);

    const verse = verseStore.getByName(verseName) ?? verseStore.getById(verseName);
    if (!verse) { console.error(`Verse not found: ${verseName}`); process.exit(1); }

    runStore.bindVerse(runId, verse.id);
    console.log(`Bound run ${runId} to verse ${verse.name}`);
  });
```

**Step 6: Implement verse cost**

```typescript
// packages/cli/src/commands/cost.ts
import { Command } from "commander";
import { join } from "node:path";
import { createDb, RunStore } from "@multiverseos/core";

export const costCommand = new Command("cost")
  .description("Show cost summary")
  .option("--verse <id>", "Filter by verse")
  .action((opts) => {
    const dbPath = join(process.cwd(), ".multiverseos", "multiverseos.db");
    const db = createDb(dbPath);
    const store = new RunStore(db);

    const runs = opts.verse ? store.listByVerse(opts.verse) : store.listAll();
    const totalCost = runs.reduce((sum, r) => sum + (r.totalCostUsd ?? 0), 0);
    const totalTokens = runs.reduce((sum, r) => sum + (r.totalTokens ?? 0), 0);

    console.log(`  Runs: ${runs.length}`);
    console.log(`  Total cost: $${totalCost.toFixed(2)}`);
    console.log(`  Total tokens: ${totalTokens.toLocaleString()}`);
  });
```

**Step 7: Register all new commands in index.ts**

Add imports and `program.addCommand(...)` for: `runsCommand`, `inspectCommand`, `timelineCommand`, `eventsCommand`, `bindCommand`, `costCommand`.

**Step 8: Build and verify**

Run: `pnpm -r build`
Expected: All packages build

**Step 9: Commit**

```bash
git add packages/cli/src/
git commit -m "feat(cli): add run query commands (runs/inspect/timeline/events/bind/cost)"
```

---

## Task 9: HTTP Server — Buffer Drain & SSE

**Files:**
- Modify: `packages/cli/src/server.ts`
- Create: `packages/cli/src/buffer-drain.ts`
- Test: `packages/cli/src/buffer-drain.test.ts`

**Step 1: Write failing test for buffer drain**

```typescript
// packages/cli/src/buffer-drain.test.ts
import { describe, it, expect } from "vitest";
import { parseBufferLine } from "./buffer-drain.js";

describe("buffer-drain", () => {
  it("parses a valid JSONL line", () => {
    const line = JSON.stringify({ session_id: "s1", cwd: "/r", type: "PreToolUse", tool_name: "Bash" });
    const result = parseBufferLine(line);
    expect(result?.session_id).toBe("s1");
  });

  it("returns null for invalid lines", () => {
    expect(parseBufferLine("not json")).toBeNull();
    expect(parseBufferLine("")).toBeNull();
  });
});
```

**Step 2: Implement buffer-drain.ts**

```typescript
// packages/cli/src/buffer-drain.ts
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { IngestEngine, HookEvent } from "@multiverseos/core";

const BUFFER_PATH = join(
  process.env.HOME ?? process.env.USERPROFILE ?? "/tmp",
  ".multiverseos",
  "buffer.jsonl"
);

export function parseBufferLine(line: string): HookEvent | null {
  if (!line.trim()) return null;
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

export function drainBuffer(engine: IngestEngine): number {
  if (!existsSync(BUFFER_PATH)) return 0;

  const content = readFileSync(BUFFER_PATH, "utf8");
  const lines = content.split("\n");
  let count = 0;

  for (const line of lines) {
    const event = parseBufferLine(line);
    if (event) {
      engine.ingest(event);
      count++;
    }
  }

  // Clear buffer
  writeFileSync(BUFFER_PATH, "");
  return count;
}
```

**Step 3: Integrate buffer drain into server startup**

Add to `packages/cli/src/server.ts` in `startServer()`:

```typescript
import { drainBuffer } from "./buffer-drain.js";
// ... after creating engine
const drained = drainBuffer(engine);
if (drained > 0) console.log(`Drained ${drained} buffered events`);
```

**Step 4: Run test**

Run: `cd packages/cli && pnpm vitest run src/buffer-drain.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/cli/src/buffer-drain.ts packages/cli/src/buffer-drain.test.ts packages/cli/src/server.ts
git commit -m "feat(cli): add offline buffer drain on server startup"
```

---

## Task 10: UI — React SPA Setup

**Files:**
- Recreate: `packages/ui/` (via Vite scaffold)

**Step 1: Scaffold Vite React project**

Run:
```bash
rm -rf packages/ui
cd packages && pnpm create vite ui -- --template react-ts
cd ui && pnpm add -D tailwindcss @tailwindcss/vite
```

**Step 2: Configure Vite proxy for API**

```typescript
// packages/ui/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": "http://127.0.0.1:7777",
    },
  },
});
```

**Step 3: Add TailwindCSS to index.css**

Replace `packages/ui/src/index.css` with:
```css
@import "tailwindcss";
```

**Step 4: Verify dev server starts**

Run: `cd packages/ui && pnpm dev`
Expected: Vite dev server on localhost:5173

**Step 5: Commit**

```bash
git add packages/ui/
git commit -m "feat(ui): scaffold React + Vite + TailwindCSS app"
```

---

## Task 11: UI — Verse List View

**Files:**
- Create: `packages/ui/src/api.ts`
- Create: `packages/ui/src/views/VerseListView.tsx`
- Modify: `packages/ui/src/App.tsx`

**Step 1: Create API client**

```typescript
// packages/ui/src/api.ts
const BASE = "/api";

export interface Verse {
  id: string;
  name: string;
  gitBranch: string;
  parentId: string | null;
  config: Record<string, unknown>;
  createdAt: string;
}

export interface Run {
  id: string;
  verseId: string | null;
  gitBranch: string | null;
  claudeSessionId: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  totalCostUsd: number | null;
  totalTokens: number | null;
}

export interface Step {
  id: string;
  runId: string;
  seq: number;
  kind: string;
  toolName: string | null;
  summary: string;
  startedAt: string;
  endedAt: string | null;
  costUsd: number | null;
  tokens: number | null;
}

export async function fetchVerses(): Promise<Verse[]> {
  const res = await fetch(`${BASE}/verses`);
  return res.json();
}

export async function fetchRuns(verseId?: string): Promise<Run[]> {
  const url = verseId ? `${BASE}/runs?verse_id=${verseId}` : `${BASE}/runs`;
  const res = await fetch(url);
  return res.json();
}

export async function fetchTimeline(runId: string): Promise<Step[]> {
  const res = await fetch(`${BASE}/runs/${runId}/timeline`);
  return res.json();
}

export async function fetchEvents(runId: string) {
  const res = await fetch(`${BASE}/runs/${runId}/events`);
  return res.json();
}
```

**Step 2: Create VerseListView**

```tsx
// packages/ui/src/views/VerseListView.tsx
import { useEffect, useState } from "react";
import { fetchVerses, fetchRuns, type Verse, type Run } from "../api";

interface VerseWithRuns extends Verse {
  runs: Run[];
}

export function VerseListView({ onSelectRun }: { onSelectRun: (runId: string) => void }) {
  const [verses, setVerses] = useState<VerseWithRuns[]>([]);
  const [orphanRuns, setOrphanRuns] = useState<Run[]>([]);

  useEffect(() => {
    Promise.all([fetchVerses(), fetchRuns()]).then(([vs, allRuns]) => {
      const verseRuns = vs.map((v) => ({
        ...v,
        runs: allRuns.filter((r) => r.verseId === v.id),
      }));
      setVerses(verseRuns);
      setOrphanRuns(allRuns.filter((r) => !r.verseId));
    });
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">MultiverseOS</h1>
      <h2 className="text-lg font-semibold mb-4">Verses</h2>

      {verses.length === 0 && orphanRuns.length === 0 && (
        <p className="text-gray-500">No data yet. Start a Claude Code session to begin collecting.</p>
      )}

      <div className="space-y-3">
        {verses.map((v) => (
          <div key={v.id} className="border rounded-lg p-4 hover:bg-gray-50">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-medium">{v.name}</span>
                <span className="ml-2 text-sm text-gray-500">{v.gitBranch}</span>
              </div>
              <div className="text-sm text-gray-500">
                {v.runs.length} runs |
                ${v.runs.reduce((s, r) => s + (r.totalCostUsd ?? 0), 0).toFixed(2)}
              </div>
            </div>
            {v.runs.length > 0 && (
              <div className="mt-2 space-y-1">
                {v.runs.slice(0, 5).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => onSelectRun(r.id)}
                    className="block w-full text-left text-sm px-2 py-1 rounded hover:bg-blue-50"
                  >
                    {r.id.slice(0, 16)}... {r.status} {r.startedAt.split("T")[0]}
                    {r.totalCostUsd != null && ` $${r.totalCostUsd.toFixed(2)}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {orphanRuns.length > 0 && (
          <div className="border rounded-lg p-4 border-dashed">
            <div className="font-medium text-gray-500">Unbound Runs</div>
            <div className="mt-2 space-y-1">
              {orphanRuns.map((r) => (
                <button
                  key={r.id}
                  onClick={() => onSelectRun(r.id)}
                  className="block w-full text-left text-sm px-2 py-1 rounded hover:bg-blue-50"
                >
                  {r.id.slice(0, 16)}... {r.status} {r.gitBranch ?? "-"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 3: Update App.tsx**

```tsx
// packages/ui/src/App.tsx
import { useState } from "react";
import { VerseListView } from "./views/VerseListView";
// TimelineView will be added in Task 12

function App() {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  if (selectedRunId) {
    return (
      <div className="min-h-screen bg-white">
        <button
          onClick={() => setSelectedRunId(null)}
          className="p-4 text-blue-600 hover:underline"
        >
          Back to verses
        </button>
        <div className="p-6">
          <p>Timeline for {selectedRunId} (next task)</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <VerseListView onSelectRun={setSelectedRunId} />
    </div>
  );
}

export default App;
```

**Step 4: Build and verify**

Run: `cd packages/ui && pnpm build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add packages/ui/src/
git commit -m "feat(ui): add VerseListView with runs display"
```

---

## Task 12: UI — Timeline View

**Files:**
- Create: `packages/ui/src/views/TimelineView.tsx`
- Create: `packages/ui/src/components/StepCard.tsx`
- Modify: `packages/ui/src/App.tsx`

**Step 1: Create StepCard component**

```tsx
// packages/ui/src/components/StepCard.tsx
import type { Step } from "../api";

const KIND_ICONS: Record<string, string> = {
  file_edit: "E",
  tool_call: "T",
  subagent: "A",
  user_prompt: "P",
  test: "X",
};

export function StepCard({ step }: { step: Step }) {
  const time = step.startedAt.split("T")[1]?.slice(0, 8) ?? "";
  const icon = KIND_ICONS[step.kind] ?? "?";
  const duration =
    step.endedAt && step.startedAt
      ? ((new Date(step.endedAt).getTime() - new Date(step.startedAt).getTime()) / 1000).toFixed(1) + "s"
      : null;

  return (
    <div className="flex items-start gap-3 py-2 px-3 hover:bg-gray-50 rounded">
      <div className="text-xs text-gray-400 font-mono w-16 pt-0.5">{time}</div>
      <div className="flex items-center justify-center w-6 h-6 rounded bg-gray-100 text-xs font-bold text-gray-600">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{step.summary || step.toolName || step.kind}</div>
        <div className="text-xs text-gray-400 flex gap-3">
          {step.toolName && <span>{step.toolName}</span>}
          {duration && <span>{duration}</span>}
          {step.costUsd != null && <span>${step.costUsd.toFixed(3)}</span>}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Create TimelineView**

```tsx
// packages/ui/src/views/TimelineView.tsx
import { useEffect, useState } from "react";
import { fetchTimeline, type Step } from "../api";
import { StepCard } from "../components/StepCard";

export function TimelineView({ runId }: { runId: string }) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimeline(runId)
      .then(setSteps)
      .finally(() => setLoading(false));
  }, [runId]);

  const totalCost = steps.reduce((s, st) => s + (st.costUsd ?? 0), 0);
  const totalTokens = steps.reduce((s, st) => s + (st.tokens ?? 0), 0);

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>;

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold mb-1">Run Timeline</h2>
      <p className="text-sm text-gray-500 mb-4">
        {runId} | {steps.length} steps | ${totalCost.toFixed(2)} | {totalTokens.toLocaleString()} tokens
      </p>

      {steps.length === 0 ? (
        <p className="text-gray-400">No steps recorded.</p>
      ) : (
        <div className="border rounded-lg divide-y">
          {steps.map((step) => (
            <StepCard key={step.id} step={step} />
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 3: Update App.tsx to use TimelineView**

Replace the placeholder in `App.tsx`:

```tsx
import { useState } from "react";
import { VerseListView } from "./views/VerseListView";
import { TimelineView } from "./views/TimelineView";

function App() {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-white">
      {selectedRunId ? (
        <>
          <button
            onClick={() => setSelectedRunId(null)}
            className="p-4 text-blue-600 hover:underline text-sm"
          >
            &larr; Back to verses
          </button>
          <TimelineView runId={selectedRunId} />
        </>
      ) : (
        <VerseListView onSelectRun={setSelectedRunId} />
      )}
    </div>
  );
}

export default App;
```

**Step 4: Build and verify**

Run: `cd packages/ui && pnpm build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add packages/ui/src/
git commit -m "feat(ui): add TimelineView with StepCard component"
```

---

## Task 13: Serve Static UI from verse serve

**Files:**
- Modify: `packages/cli/src/server.ts`
- Modify: `packages/cli/package.json`

**Step 1: Add static file serving to Hono server**

Add to `packages/cli/src/server.ts`:

```typescript
import { serveStatic } from "@hono/node-server/serve-static";
import { existsSync } from "node:fs";

// In createServer(), after API routes:
const uiDistPath = join(import.meta.dirname ?? __dirname, "../../ui/dist");
if (existsSync(uiDistPath)) {
  app.use("/*", serveStatic({ root: uiDistPath }));
  // SPA fallback
  app.get("*", serveStatic({ root: uiDistPath, path: "index.html" }));
}
```

**Step 2: Add verse ui command**

```typescript
// packages/cli/src/commands/ui.ts
import { Command } from "commander";

export const uiCommand = new Command("ui")
  .description("Open MultiverseOS UI in browser")
  .option("-p, --port <port>", "Server port", "7777")
  .action((opts) => {
    const url = `http://127.0.0.1:${opts.port}`;
    const { execSync } = require("node:child_process");
    try {
      // Linux
      execSync(`xdg-open ${url}`, { stdio: "ignore" });
    } catch {
      try {
        // macOS
        execSync(`open ${url}`, { stdio: "ignore" });
      } catch {
        console.log(`Open ${url} in your browser`);
      }
    }
  });
```

**Step 3: Register ui command and build**

Add `uiCommand` to `packages/cli/src/index.ts`.

Run: `pnpm -r build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add packages/cli/src/
git commit -m "feat(cli): serve UI static files and add verse ui command"
```

---

## Task 14: Integration Test — End-to-End

**Files:**
- Create: `packages/core/src/integration.test.ts`

**Step 1: Write integration test**

```typescript
// packages/core/src/integration.test.ts
import { describe, it, expect } from "vitest";
import { createTestDb } from "./test-utils.js";
import { VerseStore, RunStore, EventStore } from "./store/index.js";
import { IngestEngine } from "./engine/ingest.js";

describe("integration: full event flow", () => {
  it("processes a complete Claude Code session", () => {
    const db = createTestDb();
    const verseStore = new VerseStore(db);
    const runStore = new RunStore(db);
    const eventStore = new EventStore(db);
    const engine = new IngestEngine(verseStore, runStore, eventStore);

    // Setup: create a verse
    verseStore.create({ name: "test", gitBranch: "feat/test", config: { model: "sonnet" } });

    // Simulate a Claude Code session
    engine.ingest({ session_id: "s1", cwd: "/repo", type: "PreToolUse", tool_name: "Read", tool_input: { file_path: "src/main.ts" }, git_branch: "feat/test" });
    engine.ingest({ session_id: "s1", cwd: "/repo", type: "PostToolUse", tool_name: "Read", git_branch: "feat/test" });
    engine.ingest({ session_id: "s1", cwd: "/repo", type: "PreToolUse", tool_name: "Edit", tool_input: { file_path: "src/main.ts" }, git_branch: "feat/test" });
    engine.ingest({ session_id: "s1", cwd: "/repo", type: "PostToolUse", tool_name: "Edit", git_branch: "feat/test" });
    engine.ingest({ session_id: "s1", cwd: "/repo", type: "PreToolUse", tool_name: "Bash", tool_input: { command: "npm test" }, git_branch: "feat/test" });
    engine.ingest({ session_id: "s1", cwd: "/repo", type: "PostToolUse", tool_name: "Bash", git_branch: "feat/test" });
    engine.ingest({ session_id: "s1", cwd: "/repo", type: "Stop", git_branch: "feat/test" });

    // Verify
    const runs = runStore.listAll();
    expect(runs).toHaveLength(1);
    expect(runs[0].status).toBe("completed");
    expect(runs[0].verseId).toBeTruthy();

    const steps = eventStore.listStepsByRun(runs[0].id);
    expect(steps).toHaveLength(3);
    expect(steps[0].summary).toBe("Read src/main.ts");
    expect(steps[1].summary).toBe("Edit src/main.ts");
    expect(steps[2].summary).toContain("Bash: npm test");

    const events = eventStore.listByRun(runs[0].id);
    expect(events).toHaveLength(7); // 3 pre + 3 post + 1 stop

    // Verify verse association
    const verse = verseStore.getByBranch("feat/test");
    const verseRuns = runStore.listByVerse(verse!.id);
    expect(verseRuns).toHaveLength(1);
  });
});
```

**Step 2: Run integration test**

Run: `cd packages/core && pnpm vitest run src/integration.test.ts`
Expected: PASS

**Step 3: Run full test suite**

Run: `pnpm -r test`
Expected: All tests PASS across all packages

**Step 4: Commit**

```bash
git add packages/core/src/integration.test.ts
git commit -m "test: add end-to-end integration test for full event flow"
```

---

## Task 15: Final Polish & Documentation

**Files:**
- Create: `README.md`
- Verify: all packages build and tests pass

**Step 1: Build entire project**

Run: `pnpm install && pnpm -r build`
Expected: All packages build

**Step 2: Run all tests**

Run: `pnpm -r test`
Expected: All tests pass

**Step 3: Create README.md**

Write a brief README with:
- Project description (1-2 sentences)
- Quick start: `pnpm install && pnpm -r build`
- Usage: `verse init`, `verse serve`, `verse create`, `verse ui`
- Link to design doc

**Step 4: Final commit**

```bash
git add README.md
git commit -m "docs: add project README with quick start guide"
```
