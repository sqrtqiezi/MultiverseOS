import { Command } from "commander";
import { execSync } from "child_process";
import { createDb, VerseStore } from "@multiverseos/core";

export const createCommand = new Command("create")
  .description("Create a new verse")
  .argument("<name>", "Verse name")
  .option("--model <model>", "Model to use", "claude-sonnet-4-6")
  .option("--branch <branch>", "Git branch name")
  .action((name: string, opts: { model: string; branch?: string }) => {
    const branch = opts.branch ?? name;
    execSync(`git branch ${branch}`, { stdio: "inherit" });

    const db = createDb(".multiverseos/multiverseos.db");
    const store = new VerseStore(db);
    const verse = store.create({ name, gitBranch: branch, config: { model: opts.model } });

    console.log(`Created verse: ${verse.name}`);
    console.log(`  id: ${verse.id}`);
    console.log(`  branch: ${verse.gitBranch}`);
    console.log(`  model: ${opts.model}`);
  });
