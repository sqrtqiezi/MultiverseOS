import { Command } from "commander";
import { createDb, RunStore, VerseStore, EventStore } from "@multiverseos/core";

const DB_PATH = ".multiverseos/multiverseos.db";

export const inspectCommand = new Command("inspect")
  .description("Show run details")
  .argument("<run-id>", "Run ID")
  .action((runId: string) => {
    const db = createDb(DB_PATH);
    const runStore = new RunStore(db);
    const eventStore = new EventStore(db);

    const run = runStore.getById(runId);
    if (!run) {
      console.error(`Run not found: ${runId}`);
      process.exit(1);
    }

    let verseName = "none";
    if (run.verseId) {
      const verseStore = new VerseStore(db);
      const verse = verseStore.getById(run.verseId);
      verseName = verse ? verse.name : run.verseId;
    }

    const steps = eventStore.listStepsByRun(run.id);
    const events = eventStore.listByRun(run.id);

    console.log(`run: ${run.id}`);
    console.log(`verse: ${verseName}`);
    console.log(`branch: ${run.gitBranch ?? "none"}`);
    console.log(`status: ${run.status}`);
    console.log(`started: ${run.startedAt}`);
    console.log(`ended: ${run.endedAt ?? "-"}`);
    console.log(`cost: ${run.totalCostUsd !== null ? `$${run.totalCostUsd.toFixed(4)}` : "-"}`);
    console.log(`tokens: ${run.totalTokens ?? "-"}`);
    console.log(`steps: ${steps.length}`);
    console.log(`events: ${events.length}`);
  });
