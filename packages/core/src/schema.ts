import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const verses = sqliteTable("verses", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  parentId: text("parent_id"),
  gitBranch: text("git_branch").notNull(),
  forkFromCommit: text("fork_from_commit"),
  config: text("config").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
});

export const runs = sqliteTable("runs", {
  id: text("id").primaryKey(),
  verseId: text("verse_id"),
  repoCommit: text("repo_commit"),
  gitBranch: text("git_branch"),
  worktreePath: text("worktree_path"),
  claudeSessionId: text("claude_session_id").notNull(),
  status: text("status").notNull().default("running"),
  startedAt: text("started_at").notNull(),
  endedAt: text("ended_at"),
  totalCostUsd: real("total_cost_usd"),
  totalTokens: integer("total_tokens"),
});

export const steps = sqliteTable("steps", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull(),
  seq: integer("seq").notNull(),
  kind: text("kind").notNull(),
  toolName: text("tool_name"),
  summary: text("summary").notNull().default(""),
  startedAt: text("started_at").notNull(),
  endedAt: text("ended_at"),
  costUsd: real("cost_usd"),
  tokens: integer("tokens"),
});

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull(),
  stepId: text("step_id"),
  ts: text("ts").notNull(),
  source: text("source").notNull(),
  type: text("type").notNull(),
  attrs: text("attrs").notNull().default("{}"),
  payloadRef: text("payload_ref"),
});

export const artifacts = sqliteTable("artifacts", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull(),
  stepId: text("step_id"),
  type: text("type").notNull(),
  path: text("path").notNull(),
  hash: text("hash").notNull(),
  createdAt: text("created_at").notNull(),
  meta: text("meta"),
});
