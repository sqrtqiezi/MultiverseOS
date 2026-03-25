import { Command } from "commander";
import { createDb, VerseStore, RunStore } from "@multiverseos/core";

export const listCommand = new Command("list")
  .description("List all verses")
  .action(() => {
    const db = createDb(".multiverseos/multiverseos.db");
    const verseStore = new VerseStore(db);
    const runStore = new RunStore(db);

    const verses = verseStore.list();
    for (const v of verses) {
      const runs = runStore.listByVerse(v.id);
      const totalCost = runs.reduce((sum, r) => sum + (r.totalCostUsd ?? 0), 0);
      console.log(`  ${v.name}`);
      console.log(`    branch: ${v.gitBranch} | runs: ${runs.length} | id: ${v.id}`);
    }
  });
