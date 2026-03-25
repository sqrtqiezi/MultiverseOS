import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb } from "../test-utils.js";
import { VerseStore } from "../store/verse-store.js";
import { RunStore } from "../store/run-store.js";
import { EventStore } from "../store/event-store.js";
import type { DB } from "../db.js";
import { IngestEngine, type HookEvent } from "./ingest.js";

describe("IngestEngine", () => {
  let db: DB;
  let verseStore: VerseStore;
  let runStore: RunStore;
  let eventStore: EventStore;
  let engine: IngestEngine;

  beforeEach(() => {
    db = createTestDb();
    verseStore = new VerseStore(db);
    runStore = new RunStore(db);
    eventStore = new EventStore(db);
    engine = new IngestEngine(verseStore, runStore, eventStore);
  });

  it("auto-creates a run on first event for a session", () => {
    const event: HookEvent = {
      session_id: "sess-001",
      cwd: "/home/user/project",
      type: "PreToolUse",
      tool_name: "Bash",
      tool_input: { command: "ls" },
    };

    engine.ingest(event);

    const runs = runStore.listAll();
    expect(runs).toHaveLength(1);
    expect(runs[0].claudeSessionId).toBe("sess-001");
    expect(runs[0].status).toBe("running");
  });

  it("reuses run for same session_id", () => {
    const event1: HookEvent = {
      session_id: "sess-002",
      cwd: "/home/user/project",
      type: "PreToolUse",
      tool_name: "Bash",
      tool_input: { command: "ls" },
    };
    const event2: HookEvent = {
      session_id: "sess-002",
      cwd: "/home/user/project",
      type: "PreToolUse",
      tool_name: "Read",
      tool_input: { file_path: "/tmp/a.ts" },
    };

    engine.ingest(event1);
    engine.ingest(event2);

    const runs = runStore.listAll();
    expect(runs).toHaveLength(1);
  });

  it("associates run with verse by git branch", () => {
    // Create a verse with a matching branch
    const verse = verseStore.create({
      name: "feature-verse",
      gitBranch: "feature/login",
      config: {},
    });

    const event: HookEvent = {
      session_id: "sess-003",
      cwd: "/home/user/project",
      type: "PreToolUse",
      tool_name: "Bash",
      tool_input: { command: "npm test" },
      git_branch: "feature/login",
    };

    engine.ingest(event);

    const runs = runStore.listAll();
    expect(runs).toHaveLength(1);
    const run = runStore.getById(runs[0].id);
    expect(run!.verseId).toBe(verse.id);
  });

  it("creates step for PreToolUse + PostToolUse pair", () => {
    const preEvent: HookEvent = {
      session_id: "sess-004",
      cwd: "/home/user/project",
      type: "PreToolUse",
      tool_name: "Edit",
      tool_input: { file_path: "/tmp/foo.ts", old_string: "a", new_string: "b" },
    };

    engine.ingest(preEvent);

    const runs = runStore.listAll();
    const steps = eventStore.listStepsByRun(runs[0].id);
    expect(steps).toHaveLength(1);
    expect(steps[0].kind).toBe("file_edit");
    expect(steps[0].toolName).toBe("Edit");
    expect(steps[0].summary).toBe("Edit /tmp/foo.ts");
    expect(steps[0].seq).toBe(1);
    expect(steps[0].endedAt).toBeNull();

    const postEvent: HookEvent = {
      session_id: "sess-004",
      cwd: "/home/user/project",
      type: "PostToolUse",
      tool_name: "Edit",
      result: { success: true },
    };

    engine.ingest(postEvent);

    const stepsAfter = eventStore.listStepsByRun(runs[0].id);
    expect(stepsAfter).toHaveLength(1);
    expect(stepsAfter[0].endedAt).not.toBeNull();
  });

  it("handles Stop event by ending the run", () => {
    // First create the run with a regular event
    const preEvent: HookEvent = {
      session_id: "sess-005",
      cwd: "/home/user/project",
      type: "PreToolUse",
      tool_name: "Bash",
      tool_input: { command: "echo hello" },
    };
    engine.ingest(preEvent);

    const stopEvent: HookEvent = {
      session_id: "sess-005",
      cwd: "/home/user/project",
      type: "Stop",
    };
    engine.ingest(stopEvent);

    const runs = runStore.listAll();
    expect(runs).toHaveLength(1);
    const run = runStore.getById(runs[0].id);
    expect(run!.status).toBe("done");
    expect(run!.endedAt).not.toBeNull();

    // Verify a Stop event was inserted
    const events = eventStore.listByRun(runs[0].id);
    const stopEvents = events.filter((e) => e.type === "Stop");
    expect(stopEvents).toHaveLength(1);
  });
});
