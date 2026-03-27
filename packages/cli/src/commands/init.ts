import { Command } from "commander";
import { migrateDb } from "@multiverseos/core";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

type InitLogger = Pick<Console, "log" | "error">;

export interface InitOptions {
  cwd?: string;
  homeDir?: string;
  logger?: InitLogger;
  migrate?: (dbPath: string) => void;
}

function ensureHooksContainer(settings: Record<string, unknown>) {
  if (typeof settings.hooks !== "object" || settings.hooks === null || Array.isArray(settings.hooks)) {
    settings.hooks = {};
  }
  return settings.hooks as Record<string, unknown>;
}

export function runInit(options: InitOptions = {}) {
  const cwd = options.cwd ?? process.cwd();
  const homeDir = options.homeDir ?? homedir();
  const logger = options.logger ?? console;
  const migrate = options.migrate ?? migrateDb;

  const dataDir = join(cwd, ".multiverseos");
  const artifactsDir = join(dataDir, "artifacts");
  const dbPath = join(dataDir, "multiverseos.db");

  mkdirSync(dataDir, { recursive: true });
  mkdirSync(artifactsDir, { recursive: true });

  migrate(dbPath);
  logger.log(`✓ Database initialized at ${dbPath}`);

  const claudeDir = join(homeDir, ".claude");
  const settingsPath = join(claudeDir, "settings.json");
  let settings: Record<string, unknown> = { hooks: {} };

  if (existsSync(settingsPath)) {
    const raw = readFileSync(settingsPath, "utf-8");
    try {
      const parsed = JSON.parse(raw);
      settings = typeof parsed === "object" && parsed !== null ? parsed as Record<string, unknown> : { hooks: {} };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse ${settingsPath}: ${message}`);
    }
  } else {
    mkdirSync(claudeDir, { recursive: true });
  }

  const hooksRoot = ensureHooksContainer(settings);
  const hooksDir = join(cwd, "packages", "hooks", "dist");
  const hookMap = {
    PreToolUse: "pre-tool-use.js",
    PostToolUse: "post-tool-use.js",
    Notification: "notification.js",
    Stop: "stop.js"
  } as const;

  for (const [type, filename] of Object.entries(hookMap)) {
    const expectedPath = join(hooksDir, filename);
    const newHook = {
      matcher: "",
      hooks: [{
        type: "command",
        command: `node ${expectedPath}`
      }]
    };

    const current = hooksRoot[type];
    const entries = Array.isArray(current) ? current : [];
    const existingIndex = entries.findIndex((entry: any) => {
      const commands = Array.isArray(entry?.hooks) ? entry.hooks : [];
      return commands.some((hook: any) => typeof hook?.command === "string" && hook.command.includes(filename));
    });

    if (existingIndex >= 0) {
      entries[existingIndex] = newHook;
    } else {
      entries.push(newHook);
    }
    hooksRoot[type] = entries;
  }

  try {
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to write ${settingsPath}: ${message}`);
  }
  logger.log(`✓ Hooks registered in ${settingsPath}`);
}

export const initCommand = new Command("init")
  .description("Initialize MultiverseOS project")
  .action(() => {
    try {
      runInit();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`✗ ${message}`);
      process.exitCode = 1;
    }
  });
