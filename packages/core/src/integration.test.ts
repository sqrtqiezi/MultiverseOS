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
    expect(runs[0].status).toBe("done");
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
