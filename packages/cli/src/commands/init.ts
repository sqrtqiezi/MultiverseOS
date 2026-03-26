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
    let settings: any = { hooks: {} };
    if (existsSync(settingsPath)) {
      settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
      if (typeof settings.hooks !== "object" || Array.isArray(settings.hooks)) {
        settings.hooks = {};
      }
    } else {
      mkdirSync(join(homedir(), ".claude"), { recursive: true });
    }

    const hooksDir = join(process.cwd(), "packages", "hooks", "dist");
    const hookMap = {
      PreToolUse: "pre-tool-use.js",
      PostToolUse: "post-tool-use.js",
      Notification: "notification.js",
      Stop: "stop.js"
    };

    for (const [type, filename] of Object.entries(hookMap)) {
      if (!settings.hooks[type]) {
        settings.hooks[type] = [];
      }
      const existingIndex = settings.hooks[type].findIndex((entry: any) =>
        entry.hooks?.[0]?.command?.includes("@multiverseos/hooks")
      );
      const newHook = {
        matcher: "",
        hooks: [{
          type: "command",
          command: `node ${join(hooksDir, filename)}`
        }]
      };
      if (existingIndex >= 0) {
        settings.hooks[type][existingIndex] = newHook;
      } else {
        settings.hooks[type].push(newHook);
      }
    }

    writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    console.log(`✓ Hooks registered in ${settingsPath}`);
  });
