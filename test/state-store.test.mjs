import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStateStore, defaultDataDir } from "../src/state-store.mjs";

test("state storage uses the platform application-data location", () => {
  assert.equal(defaultDataDir("darwin", {}, "/Users/a"), "/Users/a/Library/Application Support/Matn");
  assert.equal(defaultDataDir("linux", { XDG_DATA_HOME: "/data" }, "/home/a"), "/data/matn");
  assert.equal(defaultDataDir("win32", { APPDATA: "C:\\Data" }, "C:\\Users\\a"), "C:\\Data/Matn");
});

test("state updates are atomic, bounded, and survive a reload", async (t) => {
  const dataDir = await mkdtemp(join(tmpdir(), "matn-state-"));
  t.after(() => rm(dataDir, { recursive: true, force: true }));
  const root = "/vault";
  const store = createStateStore({ dataDir, now: () => 1234 });
  await Promise.all([
    store.updateWorkspace(root, { lastFile: "README.md" }),
    store.updateWorkspace(root, { positions: { "README.md": { heading: "مقدمة", sectionRatio: 4, overallRatio: -2 } } })
  ]);
  const snapshot = await createStateStore({ dataDir }).snapshot(root);
  assert.equal(snapshot.workspace.lastFile, "README.md");
  assert.equal(snapshot.workspace.positions["README.md"].heading, "مقدمة");
  assert.equal(snapshot.workspace.positions["README.md"].sectionRatio, 1);
  assert.equal(snapshot.workspace.positions["README.md"].overallRatio, 0);
  assert.deepEqual(snapshot.recent.map((item) => item.root), [root]);
  assert.equal((await readFile(join(dataDir, "state.json"), "utf8")).endsWith("\n"), true);
});

test("a corrupt state file recovers as empty state on the next write", async (t) => {
  const dataDir = await mkdtemp(join(tmpdir(), "matn-state-corrupt-"));
  t.after(() => rm(dataDir, { recursive: true, force: true }));
  await writeFile(join(dataDir, "state.json"), "{broken", "utf8");
  const store = createStateStore({ dataDir, now: () => 55 });
  assert.deepEqual((await store.snapshot("/vault")).workspace, { lastFile: "", lastOpenedAt: 0, positions: {}, missingFiles: {}, favorites: [], readLater: [], annotations: [], fileMeta: {} });
  await store.updateWorkspace("/vault", { lastFile: "guide.md" });
  assert.equal((await store.snapshot("/vault")).workspace.lastFile, "guide.md");
});
