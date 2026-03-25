import { eq, and } from "drizzle-orm";
import type { DB } from "../db.js";
import { newRunId } from "../id.js";
import { runs } from "../schema.js";

export interface FindOrCreateRunInput {
  claudeSessionId: string;
  gitBranch?: string;
  verseId?: string;
  repoCommit?: string;
  worktreePath?: string;
}

export interface Run {
  id: string;
  verseId: string | null;
  repoCommit: string | null;
  gitBranch: string | null;
  worktreePath: string | null;
  claudeSessionId: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  totalCostUsd: number | null;
  totalTokens: number | null;
}

export class RunStore {
  constructor(private db: DB) {}

  findOrCreate(input: FindOrCreateRunInput): Run {
    // Try to find an existing running run for this session
    const existing = this.db
      .select()
      .from(runs)
      .where(
        and(
          eq(runs.claudeSessionId, input.claudeSessionId),
          eq(runs.status, "running"),
        ),
      )
      .get();

    if (existing) {
      return existing;
    }

    const id = newRunId();
    const now = new Date().toISOString();
    const row: typeof runs.$inferInsert = {
      id,
      claudeSessionId: input.claudeSessionId,
      gitBranch: input.gitBranch ?? null,
      verseId: input.verseId ?? null,
      repoCommit: input.repoCommit ?? null,
      worktreePath: input.worktreePath ?? null,
      status: "running",
      startedAt: now,
      endedAt: null,
      totalCostUsd: null,
      totalTokens: null,
    };
    this.db.insert(runs).values(row).run();
    return row as Run;
  }

  getById(id: string): Run | undefined {
    return this.db.select().from(runs).where(eq(runs.id, id)).get();
  }

  end(id: string, stats?: { totalCostUsd?: number; totalTokens?: number }): void {
    const now = new Date().toISOString();
    this.db
      .update(runs)
      .set({
        status: "done",
        endedAt: now,
        ...(stats?.totalCostUsd !== undefined
          ? { totalCostUsd: stats.totalCostUsd }
          : {}),
        ...(stats?.totalTokens !== undefined
          ? { totalTokens: stats.totalTokens }
          : {}),
      })
      .where(eq(runs.id, id))
      .run();
  }

  bindVerse(runId: string, verseId: string): void {
    this.db
      .update(runs)
      .set({ verseId })
      .where(eq(runs.id, runId))
      .run();
  }

  listByVerse(verseId: string): Run[] {
    return this.db
      .select()
      .from(runs)
      .where(eq(runs.verseId, verseId))
      .all();
  }

  listAll(): Run[] {
    return this.db.select().from(runs).all();
  }
}
