import { describe, it, expect } from "vitest";
import { buildPayload } from "./common.js";
import type { HookStdinData } from "./common.js";

describe("buildPayload", () => {
  it("constructs event from hook stdin data with defaults", () => {
    const stdin: HookStdinData = {
      tool_name: "Bash",
      tool_input: { command: "ls" },
    };

    const payload = buildPayload("PreToolUse", stdin);

    expect(payload.type).toBe("PreToolUse");
    expect(payload.session_id).toBe("unknown");
    expect(payload.cwd).toBeTruthy();
    expect(payload.tool_name).toBe("Bash");
    expect(payload.tool_input).toEqual({ command: "ls" });
  });

  it("uses provided session_id and cwd", () => {
    const stdin: HookStdinData = {
      session_id: "test-session",
      cwd: "/test/path",
      tool_name: "Read",
    };

    const payload = buildPayload("PostToolUse", stdin);

    expect(payload.session_id).toBe("test-session");
    expect(payload.cwd).toBe("/test/path");
    expect(payload.type).toBe("PostToolUse");
  });

  it("includes result and transcript_path when present", () => {
    const stdin: HookStdinData = {
      result: { output: "test" },
      transcript_path: "/path/to/transcript",
    };

    const payload = buildPayload("Notification", stdin);

    expect(payload.result).toEqual({ output: "test" });
    expect(payload.transcript_path).toBe("/path/to/transcript");
  });
});
