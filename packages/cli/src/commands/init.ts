import { Command } from "commander";
import { migrateDb } from "@multiverseos/core";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export const initCommand = new Command("init")
  .description("Initialize MultiverseOS project")
  .action(() => {
    const dataDir = ".multiverseos";
    const artifactsDir = join(dataDir, "artifacts");
    const dbPath = join(dataDir, "multiverseos.db");

    if (!existsSync(dataDir)) mkdirSync(dataDir);
    if (!existsSync(artifactsDir)) mkdirSync(artifactsDir);

    migrateDb(dbPath);
    console.log(`✓ Database initialized at ${dbPath}`);

    const settingsPath = join(homedir(), ".claude", "settings.json");
    let settings: any = { hooks: [] };
    if (existsSync(settingsPath)) {
      settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
      if (!settings.hooks) settings.hooks = [];
    } else {
      mkdirSync(join(homedir(), ".claude"), { recursive: true });
    }

    const hooksDir = join(process.cwd(), "node_modules", "@multiverseos", "hooks", "dist");
    const hookTypes = ["PreToolUse", "PostToolUse", "Notification", "Stop"];

    for (const type of hookTypes) {
      const existing = settings.hooks.find((h: any) => h.type === type && h.command?.includes("@multiverseos/hooks"));
      if (!existing) {
        settings.hooks.push({
          type,
          command: `node ${join(hooksDir, type.toLowerCase() + ".js")}`
        });
      }
    }

    writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    console.log(`✓ Hooks registered in ${settingsPath}`);
  });
