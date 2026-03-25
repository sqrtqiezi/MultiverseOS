import { Command } from "commander";
import { execSync } from "child_process";
import { createDb, VerseStore } from "@multiverseos/core";

export const forkCommand = new Command("fork")
  .description("Fork a verse")
  .argument("<source>", "Source verse name or ID")
  .argument("<new-name>", "New verse name")
  .option("--at <sha>", "Fork from specific commit")
  .action((source: string, newName: string, opts: { at?: string }) => {
    const db = createDb(".multiverseos/multiverseos.db");
    const store = new VerseStore(db);

    const sourceVerse = store.getById(source) ?? store.getByName(source);
    if (!sourceVerse) {
      console.error(`Source verse not found: ${source}`);
      process.exit(1);
    }

    const commit = opts.at ?? execSync(`git rev-parse ${sourceVerse.gitBranch}`, { encoding: "utf-8" }).trim();
    execSync(`git branch ${newName} ${commit}`, { stdio: "inherit" });

    const verse = store.create({
      name: newName,
      gitBranch: newName,
      config: sourceVerse.config,
      parentId: sourceVerse.id,
      forkFromCommit: commit,
    });

    console.log(`Forked ${sourceVerse.name} → ${verse.name}`);
    console.log(`  id: ${verse.id}`);
    console.log(`  branch: ${verse.gitBranch}`);
    console.log(`  fork point: ${commit.slice(0, 7)}`);
  });
