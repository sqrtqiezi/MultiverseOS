import { Command } from "commander";
import { createDb, RunStore, EventStore } from "@multiverseos/core";

const DB_PATH = ".multiverseos/multiverseos.db";

export const eventsCommand = new Command("events")
  .description("Dump raw events for a run")
  .argument("<run-id>", "Run ID")
  .option("--type <type>", "Filter by event type")
  .action((runId: string, opts: { type?: string }) => {
    const db = createDb(DB_PATH);
    const runStore = new RunStore(db);
    const eventStore = new EventStore(db);

    const run = runStore.getById(runId);
    if (!run) {
      console.error(`Run not found: ${runId}`);
      process.exit(1);
    }

    let eventList = eventStore.listByRun(run.id);

    if (opts.type) {
      eventList = eventList.filter((e) => e.type === opts.type);
    }

    console.log(JSON.stringify(eventList, null, 2));
  });
