import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb } from "../test-utils.js";
import { VerseStore } from "./verse-store.js";
import type { DB } from "../db.js";

describe("VerseStore", () => {
  let db: DB;
  let store: VerseStore;

  beforeEach(() => {
    db = createTestDb();
    store = new VerseStore(db);
  });

  it("creates and retrieves a verse by id", () => {
    const verse = store.create({
      name: "main",
      gitBranch: "main",
      config: { autoCommit: true },
    });

    expect(verse.id).toMatch(/^verse_/);
    expect(verse.name).toBe("main");
    expect(verse.gitBranch).toBe("main");
    expect(verse.config).toEqual({ autoCommit: true });
    expect(verse.createdAt).toBeDefined();

    const found = store.getById(verse.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(verse.id);
    expect(found!.config).toEqual({ autoCommit: true });
  });

  it("retrieves a verse by name", () => {
    store.create({ name: "feature-x", gitBranch: "feature-x", config: {} });
    const found = store.getByName("feature-x");
    expect(found).toBeDefined();
    expect(found!.name).toBe("feature-x");
  });

  it("retrieves a verse by branch", () => {
    store.create({ name: "dev", gitBranch: "develop", config: {} });
    const found = store.getByBranch("develop");
    expect(found).toBeDefined();
    expect(found!.gitBranch).toBe("develop");
  });

  it("lists all verses", () => {
    store.create({ name: "v1", gitBranch: "v1", config: {} });
    store.create({ name: "v2", gitBranch: "v2", config: {} });
    store.create({ name: "v3", gitBranch: "v3", config: {} });

    const all = store.list();
    expect(all).toHaveLength(3);
  });

  it("rejects duplicate names", () => {
    store.create({ name: "unique", gitBranch: "b1", config: {} });
    expect(() =>
      store.create({ name: "unique", gitBranch: "b2", config: {} }),
    ).toThrow();
  });

  it("returns undefined for non-existent id", () => {
    expect(store.getById("verse_nonexistent")).toBeUndefined();
  });

  it("returns undefined for non-existent name", () => {
    expect(store.getByName("nope")).toBeUndefined();
  });

  it("stores parentId and forkFromCommit", () => {
    const parent = store.create({
      name: "parent",
      gitBranch: "main",
      config: {},
    });
    const child = store.create({
      name: "child",
      gitBranch: "child-branch",
      config: { inherited: true },
      parentId: parent.id,
      forkFromCommit: "abc123",
    });

    expect(child.parentId).toBe(parent.id);
    expect(child.forkFromCommit).toBe("abc123");
  });
});
