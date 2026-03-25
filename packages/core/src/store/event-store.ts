import { eq, asc } from "drizzle-orm";
import type { DB } from "../db.js";
import { newEventId, newStepId } from "../id.js";
import { events, steps } from "../schema.js";

export interface InsertEventInput {
  runId: string;
  stepId?: string;
  source: string;
  type: string;
  attrs: Record<string, unknown>;
  payloadRef?: string;
}

export interface InsertStepInput {
  runId: string;
  seq: number;
  kind: string;
  toolName?: string;
  summary: string;
}

export interface Event {
  id: string;
  runId: string;
  stepId: string | null;
  ts: string;
  source: string;
  type: string;
  attrs: Record<string, unknown>;
  payloadRef: string | null;
}

export interface Step {
  id: string;
  runId: string;
  seq: number;
  kind: string;
  toolName: string | null;
  summary: string;
  startedAt: string;
  endedAt: string | null;
  costUsd: number | null;
  tokens: number | null;
}

function rowToEvent(row: typeof events.$inferSelect): Event {
  return {
    ...row,
    attrs: JSON.parse(row.attrs) as Record<string, unknown>,
  };
}

export class EventStore {
  constructor(private db: DB) {}

  insert(input: InsertEventInput): string {
    const id = newEventId();
    const now = new Date().toISOString();
    const row = {
      id,
      runId: input.runId,
      stepId: input.stepId ?? null,
      ts: now,
      source: input.source,
      type: input.type,
      attrs: JSON.stringify(input.attrs),
      payloadRef: input.payloadRef ?? null,
    };
    this.db.insert(events).values(row).run();
    return id;
  }

  insertStep(input: InsertStepInput): string {
    const id = newStepId();
    const now = new Date().toISOString();
    const row = {
      id,
      runId: input.runId,
      seq: input.seq,
      kind: input.kind,
      toolName: input.toolName ?? null,
      summary: input.summary,
      startedAt: now,
      endedAt: null,
      costUsd: null,
      tokens: null,
    };
    this.db.insert(steps).values(row).run();
    return id;
  }

  endStep(
    stepId: string,
    data?: { costUsd?: number; tokens?: number },
  ): void {
    const now = new Date().toISOString();
    this.db
      .update(steps)
      .set({
        endedAt: now,
        ...(data?.costUsd !== undefined ? { costUsd: data.costUsd } : {}),
        ...(data?.tokens !== undefined ? { tokens: data.tokens } : {}),
      })
      .where(eq(steps.id, stepId))
      .run();
  }

  listByRun(runId: string): Event[] {
    const rows = this.db
      .select()
      .from(events)
      .where(eq(events.runId, runId))
      .all();
    return rows.map(rowToEvent);
  }

  listByStep(stepId: string): Event[] {
    const rows = this.db
      .select()
      .from(events)
      .where(eq(events.stepId, stepId))
      .all();
    return rows.map(rowToEvent);
  }

  listStepsByRun(runId: string): Step[] {
    return this.db
      .select()
      .from(steps)
      .where(eq(steps.runId, runId))
      .orderBy(asc(steps.seq))
      .all();
  }
}
