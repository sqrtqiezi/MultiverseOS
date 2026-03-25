import { Command } from "commander";
import { createDb, VerseStore } from "@multiverseos/core";

export const showCommand = new Command("show")
  .description("Show verse details")
  .argument("<name-or-id>", "Verse name or ID")
  .action((nameOrId: string) => {
    const db = createDb(".multiverseos/multiverseos.db");
    const store = new VerseStore(db);

    const verse = store.getById(nameOrId) ?? store.getByName(nameOrId);
    if (!verse) {
      console.error(`Verse not found: ${nameOrId}`);
      process.exit(1);
    }

    console.log(`name: ${verse.name}`);
    console.log(`id: ${verse.id}`);
    console.log(`branch: ${verse.gitBranch}`);
    console.log(`parent: ${verse.parentId ?? "none"}`);
    console.log(`created: ${verse.createdAt}`);
    console.log(`config: ${JSON.stringify(verse.config, null, 2)}`);
  });
