import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseBufferLine, drainBuffer } from "./buffer-drain.js";
import type { HookEvent, IngestEngine } from "@multiverseos/core";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";

// Use a temp directory for testing so we don't touch real user data
const TEST_BUFFER_DIR = join(
  tmpdir(),
  ".multiverseos-test-drain"
);
const TEST_BUFFER_PATH = join(TEST_BUFFER_DIR, "buffer.jsonl");

describe("parseBufferLine", () => {
  it("parses valid JSON into HookEvent", () => {
    const json = JSON.stringify({
      session_id: "sess-1",
      cwd: "/tmp",
      type: "PreToolUse",
      tool_name: "Bash",
    });
    const result = parseBufferLine(json);
    expect(result).toEqual({
      session_id: "sess-1",
      cwd: "/tmp",
      type: "PreToolUse",
      tool_name: "Bash",
    });
  });

  it("returns null for invalid JSON", () => {
    expect(parseBufferLine("{bad json")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseBufferLine("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(parseBufferLine("   ")).toBeNull();
  });
});

describe("drainBuffer", () => {
  const mockEngine = {
    ingest: vi.fn(),
  } as unknown as IngestEngine;

  beforeEach(() => {
    vi.resetAllMocks();
    // Clean up test dir
    rmSync(TEST_BUFFER_DIR, { recursive: true, force: true });
  });

  afterEach(() => {
    rmSync(TEST_BUFFER_DIR, { recursive: true, force: true });
  });

  it("returns 0 when buffer file does not exist", () => {
    const count = drainBuffer(mockEngine, TEST_BUFFER_PATH);
    expect(count).toBe(0);
    expect(mockEngine.ingest).not.toHaveBeenCalled();
  });

  it("ingests all valid events from buffer file", () => {
    mkdirSync(TEST_BUFFER_DIR, { recursive: true });
    const event1 = { session_id: "s1", cwd: "/a", type: "PreToolUse", tool_name: "Bash" };
    const event2 = { session_id: "s2", cwd: "/b", type: "Stop" };
    writeFileSync(
      TEST_BUFFER_PATH,
      [JSON.stringify(event1), JSON.stringify(event2)].join("\n") + "\n"
    );

    const count = drainBuffer(mockEngine, TEST_BUFFER_PATH);
    expect(count).toBe(2);
    expect(mockEngine.ingest).toHaveBeenCalledTimes(2);
    expect(mockEngine.ingest).toHaveBeenCalledWith(event1);
    expect(mockEngine.ingest).toHaveBeenCalledWith(event2);
  });

  it("skips invalid lines and counts only valid ones", () => {
    mkdirSync(TEST_BUFFER_DIR, { recursive: true });
    const validEvent = { session_id: "s1", cwd: "/a", type: "PreToolUse" };
    writeFileSync(
      TEST_BUFFER_PATH,
      [JSON.stringify(validEvent), "{bad", "", "also bad"].join("\n") + "\n"
    );

    const count = drainBuffer(mockEngine, TEST_BUFFER_PATH);
    expect(count).toBe(1);
    expect(mockEngine.ingest).toHaveBeenCalledTimes(1);
  });

  it("clears the buffer file after draining", () => {
    mkdirSync(TEST_BUFFER_DIR, { recursive: true });
    const event = { session_id: "s1", cwd: "/a", type: "PreToolUse" };
    writeFileSync(TEST_BUFFER_PATH, JSON.stringify(event) + "\n");

    drainBuffer(mockEngine, TEST_BUFFER_PATH);

    const content = readFileSync(TEST_BUFFER_PATH, "utf8");
    expect(content).toBe("");
  });

  it("returns 0 for empty buffer file", () => {
    mkdirSync(TEST_BUFFER_DIR, { recursive: true });
    writeFileSync(TEST_BUFFER_PATH, "");

    const count = drainBuffer(mockEngine, TEST_BUFFER_PATH);
    expect(count).toBe(0);
    expect(mockEngine.ingest).not.toHaveBeenCalled();
  });
});
