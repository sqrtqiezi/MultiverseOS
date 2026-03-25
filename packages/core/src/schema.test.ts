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
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
      )
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
    migrateDb(dbPath);
  });

  it("createDb returns a drizzle instance", () => {
    const dbPath = makeTempDb();
    migrateDb(dbPath);
    const db = createDb(dbPath);
    expect(db).toBeDefined();
  });
});
