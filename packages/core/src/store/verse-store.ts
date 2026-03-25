import { eq } from "drizzle-orm";
import type { DB } from "../db.js";
import { newVerseId } from "../id.js";
import { verses } from "../schema.js";

export interface CreateVerseInput {
  name: string;
  gitBranch: string;
  config: Record<string, unknown>;
  parentId?: string;
  forkFromCommit?: string;
}

export interface Verse {
  id: string;
  name: string;
  parentId: string | null;
  gitBranch: string;
  forkFromCommit: string | null;
  config: Record<string, unknown>;
  createdAt: string;
}

function rowToVerse(row: typeof verses.$inferSelect): Verse {
  return {
    ...row,
    config: JSON.parse(row.config) as Record<string, unknown>,
  };
}

export class VerseStore {
  constructor(private db: DB) {}

  create(input: CreateVerseInput): Verse {
    const id = newVerseId();
    const now = new Date().toISOString();
    const row = {
      id,
      name: input.name,
      gitBranch: input.gitBranch,
      config: JSON.stringify(input.config),
      parentId: input.parentId ?? null,
      forkFromCommit: input.forkFromCommit ?? null,
      createdAt: now,
    };
    this.db.insert(verses).values(row).run();
    return rowToVerse({ ...row });
  }

  getById(id: string): Verse | undefined {
    const row = this.db.select().from(verses).where(eq(verses.id, id)).get();
    return row ? rowToVerse(row) : undefined;
  }

  getByName(name: string): Verse | undefined {
    const row = this.db
      .select()
      .from(verses)
      .where(eq(verses.name, name))
      .get();
    return row ? rowToVerse(row) : undefined;
  }

  getByBranch(branch: string): Verse | undefined {
    const row = this.db
      .select()
      .from(verses)
      .where(eq(verses.gitBranch, branch))
      .get();
    return row ? rowToVerse(row) : undefined;
  }

  list(): Verse[] {
    const rows = this.db.select().from(verses).all();
    return rows.map(rowToVerse);
  }
}
