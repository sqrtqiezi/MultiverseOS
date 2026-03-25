import { Command } from "commander";
import { createDb, RunStore, VerseStore } from "@multiverseos/core";

const DB_PATH = ".multiverseos/multiverseos.db";

export const bindCommand = new Command("bind")
  .description("Bind an orphan run to a verse")
  .argument("<run-id>", "Run ID")
  .argument("<verse>", "Verse name or ID")
  .action((runId: string, verse: string) => {
    const db = createDb(DB_PATH);
    const runStore = new RunStore(db);
    const verseStore = new VerseStore(db);

    const run = runStore.getById(runId);
    if (!run) {
      console.error(`Run not found: ${runId}`);
      process.exit(1);
    }

    const v = verseStore.getById(verse) ?? verseStore.getByName(verse);
    if (!v) {
      console.error(`Verse not found: ${verse}`);
      process.exit(1);
    }

    runStore.bindVerse(run.id, v.id);
    console.log(`Bound run ${run.id} to verse ${v.name}`);
  });
