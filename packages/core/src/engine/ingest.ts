import type { VerseStore } from "../store/verse-store.js";
import type { RunStore } from "../store/run-store.js";
import type { EventStore } from "../store/event-store.js";

export interface HookEvent {
  session_id: string;
  cwd: string;
  type: string; // "PreToolUse" | "PostToolUse" | "Notification" | "Stop" | etc.
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  result?: unknown;
  git_branch?: string;
  transcript_path?: string;
  [key: string]: unknown;
}

export class IngestEngine {
  /** Active step id per run — tracks PreToolUse awaiting its PostToolUse */
  private activeSteps = new Map<string, string>();
  /** Step sequence counter per run */
  private stepSeqs = new Map<string, number>();

  constructor(
    public verseStore: VerseStore,
    public runStore: RunStore,
    public eventStore: EventStore,
  ) {}

  ingest(event: HookEvent): void {
    // 1. Find or create run by session_id
    const run = this.runStore.findOrCreate({
      claudeSessionId: event.session_id,
      gitBranch: event.git_branch,
    });

    // 2. If run has no verse and event has git_branch, try to match verse by branch
    if (!run.verseId && event.git_branch) {
      const verse = this.verseStore.getByBranch(event.git_branch);
      if (verse) {
        this.runStore.bindVerse(run.id, verse.id);
      }
    }

    // 3. If Stop event, end the run and insert Stop event, return
    if (event.type === "Stop") {
      this.eventStore.insert({
        runId: run.id,
        source: "hook",
        type: "Stop",
        attrs: {},
      });
      this.runStore.end(run.id);
      return;
    }

    let stepId: string | undefined;

    // 4. If PreToolUse: increment step seq, create step, store active step
    if (event.type === "PreToolUse" && event.tool_name) {
      const seq = (this.stepSeqs.get(run.id) ?? 0) + 1;
      this.stepSeqs.set(run.id, seq);

      const kind = classifyKind(event.tool_name);
      const summary = buildSummary(event);

      stepId = this.eventStore.insertStep({
        runId: run.id,
        seq,
        kind,
        toolName: event.tool_name,
        summary,
      });
      this.activeSteps.set(run.id, stepId);
    }

    // 5. If PostToolUse: get active step, call endStep, clear active step
    if (event.type === "PostToolUse") {
      const activeStepId = this.activeSteps.get(run.id);
      if (activeStepId) {
        this.eventStore.endStep(activeStepId);
        this.activeSteps.delete(run.id);
        stepId = activeStepId;
      }
    }

    // 6. Insert event (always)
    this.eventStore.insert({
      runId: run.id,
      stepId,
      source: "hook",
      type: event.type,
      attrs: {
        tool_name: event.tool_name,
        ...(event.tool_input ? { tool_input: event.tool_input } : {}),
        ...(event.result !== undefined ? { result: event.result } : {}),
      },
    });
  }
}

/** Classify tool name into a step kind */
export function classifyKind(toolName: string): string {
  switch (toolName) {
    case "Edit":
    case "Write":
      return "file_edit";
    case "Agent":
      return "subagent";
    case "Bash":
    case "Read":
    case "Glob":
    case "Grep":
    default:
      return "tool_call";
  }
}

/** Build a human-readable summary for a step */
export function buildSummary(event: HookEvent): string {
  const toolName = event.tool_name ?? "unknown";
  const input = event.tool_input;

  switch (toolName) {
    case "Bash": {
      const cmd = input?.command;
      return typeof cmd === "string" ? `Bash: ${cmd}` : "Bash";
    }
    case "Edit":
    case "Write":
    case "Read": {
      const filePath = input?.file_path;
      return typeof filePath === "string" ? `${toolName} ${filePath}` : toolName;
    }
    case "Grep": {
      const pattern = input?.pattern;
      return typeof pattern === "string" ? `Grep "${pattern}"` : "Grep";
    }
    default:
      return toolName;
  }
}
