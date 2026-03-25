import { Command } from "commander";
import { createDb, RunStore, EventStore } from "@multiverseos/core";

const DB_PATH = ".multiverseos/multiverseos.db";

function kindIcon(kind: string): string {
  switch (kind) {
    case "file_edit":
      return "E";
    case "subagent":
      return "A";
    case "tool_call":
      return "T";
    default:
      return "?";
  }
}

export const timelineCommand = new Command("timeline")
  .description("Show step timeline for a run")
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

    const steps = eventStore.listStepsByRun(run.id);

    if (steps.length === 0) {
      console.log("No steps recorded.");
      return;
    }

    for (const step of steps) {
      const time = step.startedAt;
      const icon = kindIcon(step.kind);
      const cost = step.costUsd !== null ? `  $${step.costUsd.toFixed(4)}` : "";
      console.log(`  ${time}  [${icon}] ${step.summary}${cost}`);
    }
  });
