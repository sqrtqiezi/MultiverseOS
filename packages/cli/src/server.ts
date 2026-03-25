import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { createDb, IngestEngine, VerseStore, RunStore, EventStore } from "@multiverseos/core";
import { drainBuffer } from "./buffer-drain.js";

export function createServer(opts: { port: number; dbPath: string }) {
  const app = new Hono();
  const db = createDb(opts.dbPath);
  const verseStore = new VerseStore(db);
  const runStore = new RunStore(db);
  const eventStore = new EventStore(db);
  const engine = new IngestEngine(verseStore, runStore, eventStore);

  app.post("/api/events", async (c) => {
    const body = await c.req.json();
    await engine.ingest(body);
    return c.json({ ok: true });
  });

  app.get("/api/verses", async (c) => {
    const verses = verseStore.list();
    return c.json(verses);
  });

  app.get("/api/verses/:id", async (c) => {
    const id = c.req.param("id");
    const verse = verseStore.getById(id) || verseStore.getByName(id);
    if (!verse) return c.json({ error: "Not found" }, 404);
    return c.json(verse);
  });

  app.post("/api/verses", async (c) => {
    const body = await c.req.json();
    const verse = verseStore.create(body);
    return c.json(verse);
  });

  app.get("/api/runs", async (c) => {
    const verseId = c.req.query("verse_id");
    const runs = verseId ? runStore.listByVerse(verseId) : runStore.listAll();
    return c.json(runs);
  });

  app.get("/api/runs/:id", async (c) => {
    const id = c.req.param("id");
    const run = runStore.getById(id);
    if (!run) return c.json({ error: "Not found" }, 404);
    return c.json(run);
  });

  app.get("/api/runs/:id/events", async (c) => {
    const id = c.req.param("id");
    const events = eventStore.listByRun(id);
    return c.json(events);
  });

  app.get("/api/runs/:id/timeline", async (c) => {
    const id = c.req.param("id");
    const steps = eventStore.listStepsByRun(id);
    return c.json(steps);
  });

  app.get("/api/runs/:id/stream", async (c) => {
    c.header("Content-Type", "text/event-stream");
    c.header("Cache-Control", "no-cache");
    c.header("Connection", "keep-alive");
    return c.body('data: {"type":"connected"}\n\n');
  });

  return { app, engine };
}

export function startServer(opts: { port: number; dbPath: string }) {
  const { app, engine } = createServer(opts);
  const drained = drainBuffer(engine);
  if (drained > 0) console.log(`Drained ${drained} buffered events`);
  console.log(`🚀 MultiverseOS server listening on http://localhost:${opts.port}`);
  serve({ fetch: app.fetch, port: opts.port });
}
