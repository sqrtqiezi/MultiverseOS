import { Command } from "commander";
import { createDb, RunStore, VerseStore } from "@multiverseos/core";

const DB_PATH = ".multiverseos/multiverseos.db";

export const costCommand = new Command("cost")
  .description("Show cost summary")
  .option("--verse <id>", "Filter by verse name or ID")
  .action((opts: { verse?: string }) => {
    const db = createDb(DB_PATH);
    const runStore = new RunStore(db);

    let runList;
    if (opts.verse) {
      const verseStore = new VerseStore(db);
      const verse = verseStore.getById(opts.verse) ?? verseStore.getByName(opts.verse);
      if (!verse) {
        console.error(`Verse not found: ${opts.verse}`);
        process.exit(1);
      }
      runList = runStore.listByVerse(verse.id);
    } else {
      runList = runStore.listAll();
    }

    const totalRuns = runList.length;
    const totalCost = runList.reduce((sum, r) => sum + (r.totalCostUsd ?? 0), 0);
    const totalTokens = runList.reduce((sum, r) => sum + (r.totalTokens ?? 0), 0);

    console.log(`runs: ${totalRuns}`);
    console.log(`cost: $${totalCost.toFixed(4)}`);
    console.log(`tokens: ${totalTokens}`);
  });
