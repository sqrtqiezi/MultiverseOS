import { Command } from "commander";
import { createDb, RunStore, VerseStore } from "@multiverseos/core";

const DB_PATH = ".multiverseos/multiverseos.db";

export const runsCommand = new Command("runs")
  .description("List runs, optionally filtered by verse")
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

    if (runList.length === 0) {
      console.log("No runs found.");
      return;
    }

    for (const r of runList) {
      const idShort = r.id.length > 12 ? r.id.slice(0, 12) + "..." : r.id;
      const cost = r.totalCostUsd !== null ? `$${r.totalCostUsd.toFixed(4)}` : "-";
      console.log(`  ${idShort}  ${r.status}  ${cost}  ${r.startedAt}`);
    }
  });
