import { readFile, appendFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface HookStdinData {
  session_id?: string;
  cwd?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  result?: unknown;
  transcript_path?: string;
  [key: string]: unknown;
}

export interface EventPayload {
  session_id: string;
  cwd: string;
  type: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  result?: unknown;
  transcript_path?: string;
  git_branch?: string;
}

export async function readStdin(): Promise<HookStdinData> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve({}), 1000);
    let data = "";

    process.stdin.on("data", (chunk) => {
      data += chunk;
    });

    process.stdin.on("end", () => {
      clearTimeout(timeout);
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
  });
}

export function buildPayload(type: string, stdin: HookStdinData): EventPayload {
  return {
    session_id: stdin.session_id ?? "unknown",
    cwd: stdin.cwd ?? process.cwd(),
    type,
    tool_name: stdin.tool_name,
    tool_input: stdin.tool_input,
    result: stdin.result,
    transcript_path: stdin.transcript_path,
  };
}

export async function sendEvent(payload: EventPayload): Promise<void> {
  const url = process.env.VERSE_INGEST_URL ?? "http://127.0.0.1:7777/api/events";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);
  } catch {
    const bufferPath = join(homedir(), ".multiverseos", "buffer.jsonl");
    await mkdir(join(homedir(), ".multiverseos"), { recursive: true });
    await appendFile(bufferPath, JSON.stringify(payload) + "\n");
  }
}

export async function getGitBranch(cwd: string): Promise<string | undefined> {
  try {
    const { stdout } = await execAsync("git rev-parse --abbrev-ref HEAD", { cwd });
    return stdout.trim();
  } catch {
    return undefined;
  }
}
