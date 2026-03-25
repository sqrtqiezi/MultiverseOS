import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb } from "../test-utils.js";
import { RunStore } from "./run-store.js";
import { VerseStore } from "./verse-store.js";
import type { DB } from "../db.js";

describe("RunStore", () => {
  let db: DB;
  let runStore: RunStore;
  let verseStore: VerseStore;

  beforeEach(() => {
    db = createTestDb();
    runStore = new RunStore(db);
    verseStore = new VerseStore(db);
  });

  it("creates a run from session id", () => {
    const run = runStore.findOrCreate({ claudeSessionId: "session-1" });

    expect(run.id).toMatch(/^run_/);
    expect(run.claudeSessionId).toBe("session-1");
    expect(run.status).toBe("running");
    expect(run.startedAt).toBeDefined();
  });

  it("returns existing running run for same session id", () => {
    const run1 = runStore.findOrCreate({ claudeSessionId: "session-2" });
    const run2 = runStore.findOrCreate({ claudeSessionId: "session-2" });

    expect(run1.id).toBe(run2.id);
  });

  it("creates new run if previous run for session is ended", () => {
    const run1 = runStore.findOrCreate({ claudeSessionId: "session-3" });
    runStore.end(run1.id);
    const run2 = runStore.findOrCreate({ claudeSessionId: "session-3" });

    expect(run2.id).not.toBe(run1.id);
  });

  it("ends a run with stats", () => {
    const run = runStore.findOrCreate({ claudeSessionId: "session-4" });
    runStore.end(run.id, { totalCostUsd: 0.05, totalTokens: 1200 });

    const ended = runStore.getById(run.id);
    expect(ended).toBeDefined();
    expect(ended!.status).toBe("done");
    expect(ended!.endedAt).toBeDefined();
    expect(ended!.totalCostUsd).toBe(0.05);
    expect(ended!.totalTokens).toBe(1200);
  });

  it("ends a run without stats", () => {
    const run = runStore.findOrCreate({ claudeSessionId: "session-5" });
    runStore.end(run.id);

    const ended = runStore.getById(run.id);
    expect(ended!.status).toBe("done");
    expect(ended!.endedAt).toBeDefined();
  });

  it("binds a run to a verse", () => {
    const verse = verseStore.create({
      name: "test-verse",
      gitBranch: "test",
      config: {},
    });
    const run = runStore.findOrCreate({ claudeSessionId: "session-6" });

    runStore.bindVerse(run.id, verse.id);

    const updated = runStore.getById(run.id);
    expect(updated!.verseId).toBe(verse.id);
  });

  it("lists runs by verse", () => {
    const verse = verseStore.create({
      name: "v1",
      gitBranch: "v1",
      config: {},
    });
    const run1 = runStore.findOrCreate({
      claudeSessionId: "s1",
      verseId: verse.id,
    });
    const run2 = runStore.findOrCreate({
      claudeSessionId: "s2",
      verseId: verse.id,
    });
    runStore.findOrCreate({ claudeSessionId: "s3" }); // no verse

    const runs = runStore.listByVerse(verse.id);
    expect(runs).toHaveLength(2);
    expect(runs.map((r) => r.id).sort()).toEqual([run1.id, run2.id].sort());
  });

  it("lists all runs", () => {
    runStore.findOrCreate({ claudeSessionId: "a" });
    runStore.findOrCreate({ claudeSessionId: "b" });
    runStore.findOrCreate({ claudeSessionId: "c" });

    const all = runStore.listAll();
    expect(all).toHaveLength(3);
  });

  it("getById returns undefined for non-existent id", () => {
    expect(runStore.getById("run_nope")).toBeUndefined();
  });

  it("creates run with gitBranch and repoCommit", () => {
    const run = runStore.findOrCreate({
      claudeSessionId: "session-7",
      gitBranch: "feature/x",
      repoCommit: "deadbeef",
    });

    expect(run.gitBranch).toBe("feature/x");
    expect(run.repoCommit).toBe("deadbeef");
  });
});
