import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { runInit } from "./init.js";

function makeTempDir(prefix: string) {
  return mkdtempSync(join(tmpdir(), prefix));
}

describe("runInit", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs) {
      rmSync(dir, { recursive: true, force: true });
    }
    dirs.length = 0;
  });

  it("initializes .multiverseos and writes Claude hooks", () => {
    const cwd = makeTempDir("mv-init-cwd-");
    const homeDir = makeTempDir("mv-init-home-");
    dirs.push(cwd, homeDir);

    const migrate = vi.fn();
    const logger = { log: vi.fn(), error: vi.fn() };
    runInit({ cwd, homeDir, migrate, logger });

    expect(existsSync(join(cwd, ".multiverseos"))).toBe(true);
    expect(existsSync(join(cwd, ".multiverseos", "artifacts"))).toBe(true);
    expect(migrate).toHaveBeenCalledWith(join(cwd, ".multiverseos", "multiverseos.db"));

    const settingsPath = join(homeDir, ".claude", "settings.json");
    expect(existsSync(settingsPath)).toBe(true);
    const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));

    for (const type of ["PreToolUse", "PostToolUse", "Notification", "Stop"]) {
      expect(Array.isArray(settings.hooks[type])).toBe(true);
      expect(settings.hooks[type]).toHaveLength(1);
      expect(settings.hooks[type][0].hooks[0].command).toContain("packages/hooks/dist");
    }
  });

  it("is idempotent and replaces existing hook entries without duplication", () => {
    const cwd = makeTempDir("mv-init-cwd-");
    const homeDir = makeTempDir("mv-init-home-");
    dirs.push(cwd, homeDir);

    const claudeDir = join(homeDir, ".claude");
    mkdirSync(claudeDir, { recursive: true });
    const settingsPath = join(claudeDir, "settings.json");
    writeFileSync(settingsPath, JSON.stringify({
      hooks: {
        PreToolUse: [{
          matcher: "",
          hooks: [{ type: "command", command: "node old/pre-tool-use.js" }]
        }],
        PostToolUse: [{
          matcher: "",
          hooks: [{ type: "command", command: "node old/post-tool-use.js" }]
        }]
      }
    }, null, 2));

    const migrate = vi.fn();
    runInit({ cwd, homeDir, migrate });
    runInit({ cwd, homeDir, migrate });

    const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    for (const type of ["PreToolUse", "PostToolUse", "Notification", "Stop"]) {
      expect(settings.hooks[type]).toHaveLength(1);
    }
  });

  it("throws a clear error when settings.json is invalid JSON", () => {
    const cwd = makeTempDir("mv-init-cwd-");
    const homeDir = makeTempDir("mv-init-home-");
    dirs.push(cwd, homeDir);

    const claudeDir = join(homeDir, ".claude");
    mkdirSync(claudeDir, { recursive: true });
    const settingsPath = join(claudeDir, "settings.json");
    writeFileSync(settingsPath, "{ invalid json");

    const migrate = vi.fn();
    expect(() => runInit({ cwd, homeDir, migrate })).toThrow(
      `Failed to parse ${settingsPath}`
    );
  });
});

