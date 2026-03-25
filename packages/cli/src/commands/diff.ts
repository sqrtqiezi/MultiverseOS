import { Command } from "commander";
import { createDb, VerseStore } from "@multiverseos/core";

export const diffCommand = new Command("diff")
  .description("Compare two verses")
  .argument("<a>", "First verse name or ID")
  .argument("<b>", "Second verse name or ID")
  .action((a: string, b: string) => {
    const db = createDb(".multiverseos/multiverseos.db");
    const store = new VerseStore(db);

    const verseA = store.getById(a) ?? store.getByName(a);
    const verseB = store.getById(b) ?? store.getByName(b);

    if (!verseA) {
      console.error(`Verse not found: ${a}`);
      process.exit(1);
    }
    if (!verseB) {
      console.error(`Verse not found: ${b}`);
      process.exit(1);
    }

    console.log(`--- ${verseA.name}`);
    console.log(`+++ ${verseB.name}`);

    const allKeys = new Set([...Object.keys(verseA.config), ...Object.keys(verseB.config)]);
    for (const key of allKeys) {
      const valA = verseA.config[key];
      const valB = verseB.config[key];
      if (JSON.stringify(valA) !== JSON.stringify(valB)) {
        console.log(`- ${key}: ${JSON.stringify(valA)}`);
        console.log(`+ ${key}: ${JSON.stringify(valB)}`);
      }
    }
  });
