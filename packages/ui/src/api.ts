const BASE = "/api";

export interface Verse {
  id: string;
  name: string;
  gitBranch: string;
  parentId: string | null;
  config: Record<string, unknown>;
  createdAt: string;
}

export interface Run {
  id: string;
  verseId: string | null;
  gitBranch: string | null;
  claudeSessionId: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  totalCostUsd: number | null;
  totalTokens: number | null;
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

export async function fetchVerses(): Promise<Verse[]> {
  const res = await fetch(`${BASE}/verses`);
  return res.json();
}

export async function fetchRuns(verseId?: string): Promise<Run[]> {
  const url = verseId ? `${BASE}/runs?verse_id=${verseId}` : `${BASE}/runs`;
  const res = await fetch(url);
  return res.json();
}

export async function fetchTimeline(runId: string): Promise<Step[]> {
  const res = await fetch(`${BASE}/runs/${runId}/timeline`);
  return res.json();
}

export async function fetchEvents(runId: string) {
  const res = await fetch(`${BASE}/runs/${runId}/events`);
  return res.json();
}
