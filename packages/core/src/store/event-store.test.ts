import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb } from "../test-utils.js";
import { EventStore } from "./event-store.js";
import { RunStore } from "./run-store.js";
import type { DB } from "../db.js";

describe("EventStore", () => {
  let db: DB;
  let eventStore: EventStore;
  let runStore: RunStore;
  let runId: string;

  beforeEach(() => {
    db = createTestDb();
    eventStore = new EventStore(db);
    runStore = new RunStore(db);
    const run = runStore.findOrCreate({ claudeSessionId: "test-session" });
    runId = run.id;
  });

  it("inserts and retrieves events", () => {
    const eventId = eventStore.insert({
      runId,
      source: "hook",
      type: "tool_use",
      attrs: { tool: "bash", cost: 0.01 },
    });

    expect(eventId).toMatch(/^evt_/);

    const events = eventStore.listByRun(runId);
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe(eventId);
    expect(events[0].source).toBe("hook");
    expect(events[0].type).toBe("tool_use");
    expect(events[0].attrs).toEqual({ tool: "bash", cost: 0.01 });
  });

  it("inserts event with payloadRef", () => {
    const eventId = eventStore.insert({
      runId,
      source: "hook",
      type: "snapshot",
      attrs: {},
      payloadRef: "/tmp/payload.json",
    });

    const events = eventStore.listByRun(runId);
    expect(events[0].payloadRef).toBe("/tmp/payload.json");
  });

  it("inserts a step and links events to it", () => {
    const stepId = eventStore.insertStep({
      runId,
      seq: 1,
      kind: "tool",
      toolName: "bash",
      summary: "Run ls command",
    });

    expect(stepId).toMatch(/^step_/);

    eventStore.insert({
      runId,
      stepId,
      source: "hook",
      type: "tool_input",
      attrs: { cmd: "ls" },
    });
    eventStore.insert({
      runId,
      stepId,
      source: "hook",
      type: "tool_output",
      attrs: { exit: 0 },
    });

    const stepEvents = eventStore.listByStep(stepId);
    expect(stepEvents).toHaveLength(2);
    expect(stepEvents[0].stepId).toBe(stepId);
    expect(stepEvents[1].stepId).toBe(stepId);
  });

  it("ends a step with cost data", () => {
    const stepId = eventStore.insertStep({
      runId,
      seq: 1,
      kind: "tool",
      summary: "test step",
    });

    eventStore.endStep(stepId, { costUsd: 0.03, tokens: 500 });

    const steps = eventStore.listStepsByRun(runId);
    expect(steps).toHaveLength(1);
    expect(steps[0].endedAt).toBeDefined();
    expect(steps[0].costUsd).toBe(0.03);
    expect(steps[0].tokens).toBe(500);
  });

  it("ends a step without cost data", () => {
    const stepId = eventStore.insertStep({
      runId,
      seq: 1,
      kind: "assistant",
      summary: "thinking",
    });

    eventStore.endStep(stepId);

    const steps = eventStore.listStepsByRun(runId);
    expect(steps[0].endedAt).toBeDefined();
  });

  it("lists steps for run ordered by seq", () => {
    eventStore.insertStep({
      runId,
      seq: 3,
      kind: "tool",
      summary: "third",
    });
    eventStore.insertStep({
      runId,
      seq: 1,
      kind: "assistant",
      summary: "first",
    });
    eventStore.insertStep({
      runId,
      seq: 2,
      kind: "tool",
      summary: "second",
    });

    const steps = eventStore.listStepsByRun(runId);
    expect(steps).toHaveLength(3);
    expect(steps[0].seq).toBe(1);
    expect(steps[1].seq).toBe(2);
    expect(steps[2].seq).toBe(3);
    expect(steps[0].summary).toBe("first");
  });

  it("returns empty arrays for non-existent run", () => {
    expect(eventStore.listByRun("run_nope")).toEqual([]);
    expect(eventStore.listStepsByRun("run_nope")).toEqual([]);
  });

  it("inserts multiple events for a run", () => {
    eventStore.insert({
      runId,
      source: "hook",
      type: "start",
      attrs: {},
    });
    eventStore.insert({
      runId,
      source: "hook",
      type: "tool_use",
      attrs: { tool: "read" },
    });
    eventStore.insert({
      runId,
      source: "hook",
      type: "end",
      attrs: {},
    });

    const events = eventStore.listByRun(runId);
    expect(events).toHaveLength(3);
  });
});
