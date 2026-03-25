import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { IngestEngine, HookEvent } from "@multiverseos/core";

const DEFAULT_BUFFER_PATH = join(
  process.env.HOME ?? process.env.USERPROFILE ?? "/tmp",
  ".multiverseos",
  "buffer.jsonl"
);

export function parseBufferLine(line: string): HookEvent | null {
  if (!line.trim()) return null;
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

export function drainBuffer(
  engine: IngestEngine,
  bufferPath: string = DEFAULT_BUFFER_PATH
): number {
  if (!existsSync(bufferPath)) return 0;
  const content = readFileSync(bufferPath, "utf8");
  const lines = content.split("\n");
  let count = 0;
  for (const line of lines) {
    const event = parseBufferLine(line);
    if (event) {
      engine.ingest(event);
      count++;
    }
  }
  writeFileSync(bufferPath, "");
  return count;
}
