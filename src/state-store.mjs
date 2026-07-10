// Persistent reader state. Data lives outside the opened workspace and every
// update is an atomic replace so an interrupted write cannot truncate state.

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const VERSION = 1;
const MAX_RECENTS = 12;

export function defaultDataDir(platform = process.platform, env = process.env, home = homedir()) {
  if (platform === "darwin") return join(home, "Library", "Application Support", "Matn");
  if (platform === "win32") return join(env.APPDATA || join(home, "AppData", "Roaming"), "Matn");
  return join(env.XDG_DATA_HOME || join(home, ".local", "share"), "matn");
}

function emptyState() {
  return { version: VERSION, recent: [], workspaces: {} };
}

function finiteRatio(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 0;
}

function cleanPosition(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return {
    heading: typeof value.heading === "string" ? value.heading.slice(0, 240) : "",
    sectionRatio: finiteRatio(value.sectionRatio),
    overallRatio: finiteRatio(value.overallRatio),
    updatedAt: Number.isFinite(Number(value.updatedAt)) ? Number(value.updatedAt) : Date.now()
  };
}

function cleanBookmark(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const type = ["file", "heading", "selection"].includes(value.type) ? value.type : "file";
  if (typeof value.id !== "string" || !value.id || typeof value.path !== "string" || !value.path) return null;
  return { id: value.id.slice(0, 120), type, path: value.path.slice(0, 1000), heading: String(value.heading || "").slice(0, 240), quote: String(value.quote || "").slice(0, 5000), createdAt: Number(value.createdAt) || Date.now() };
}

function cleanAnnotation(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (typeof value.id !== "string" || !value.id || typeof value.path !== "string" || !value.path || typeof value.quote !== "string" || !value.quote) return null;
  return {
    id: value.id.slice(0, 120), path: value.path.slice(0, 1000), quote: value.quote.slice(0, 5000),
    prefix: String(value.prefix || "").slice(-100), suffix: String(value.suffix || "").slice(0, 100), heading: String(value.heading || "").slice(0, 240),
    color: ["yellow", "green", "blue", "rose"].includes(value.color) ? value.color : "yellow", note: String(value.note || "").slice(0, 20000),
    status: value.status === "orphan" ? "orphan" : "attached", createdAt: Number(value.createdAt) || Date.now(), updatedAt: Number(value.updatedAt) || Date.now()
  };
}

function cleanWorkspace(value) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const positions = {};
  if (input.positions && typeof input.positions === "object" && !Array.isArray(input.positions)) {
    for (const key of Object.keys(input.positions).slice(-5000)) {
      if (typeof key !== "string" || key.length > 1000 || key.includes("\0")) continue;
      const position = cleanPosition(input.positions[key]);
      if (position) positions[key] = position;
    }
  }
  const missingFiles = {};
  if (input.missingFiles && typeof input.missingFiles === "object" && !Array.isArray(input.missingFiles)) {
    for (const key of Object.keys(input.missingFiles).slice(-5000)) {
      const entry = input.missingFiles[key];
      if (typeof key !== "string" || key.length > 1000 || !entry || typeof entry !== "object") continue;
      missingFiles[key] = { missingAt: Number(entry.missingAt) || 0, reason: entry.reason === "trash" ? "trash" : "missing" };
    }
  }
  const favorites = Array.isArray(input.favorites) ? input.favorites.map(cleanBookmark).filter(Boolean).slice(-10000) : [];
  const readLater = Array.isArray(input.readLater) ? input.readLater.map(cleanBookmark).filter(Boolean).slice(-5000) : [];
  const annotations = Array.isArray(input.annotations) ? input.annotations.map(cleanAnnotation).filter(Boolean).slice(-10000) : [];
  const fileMeta = {};
  if (input.fileMeta && typeof input.fileMeta === "object" && !Array.isArray(input.fileMeta)) {
    for (const key of Object.keys(input.fileMeta).slice(-5000)) { const entry = input.fileMeta[key]; if (!entry || typeof entry !== "object") continue; fileMeta[key] = { mtimeMs: Number(entry.mtimeMs) || 0, size: Number(entry.size) || 0, hash: typeof entry.hash === "string" ? entry.hash.slice(0, 128) : "", readAt: Number(entry.readAt) || 0 }; }
  }
  return {
    lastFile: typeof input.lastFile === "string" ? input.lastFile.slice(0, 1000) : "",
    lastOpenedAt: Number.isFinite(Number(input.lastOpenedAt)) ? Number(input.lastOpenedAt) : 0,
    positions,
    missingFiles,
    favorites,
    readLater,
    annotations,
    fileMeta
  };
}

function cleanState(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return emptyState();
  const workspaces = {};
  if (value.workspaces && typeof value.workspaces === "object" && !Array.isArray(value.workspaces)) {
    for (const root of Object.keys(value.workspaces).slice(-200)) {
      if (typeof root !== "string" || !root || root.length > 4000 || root.includes("\0")) continue;
      workspaces[root] = cleanWorkspace(value.workspaces[root]);
    }
  }
  const recent = Array.isArray(value.recent)
    ? value.recent.filter((root) => typeof root === "string" && workspaces[root]).slice(0, MAX_RECENTS)
    : [];
  return { version: VERSION, recent, workspaces };
}

export function createStateStore({ dataDir = defaultDataDir(), now = () => Date.now() } = {}) {
  const file = join(dataDir, "state.json");
  let cache = null;
  let queue = Promise.resolve();

  async function load() {
    if (cache) return cache;
    try { cache = cleanState(JSON.parse(await readFile(file, "utf8"))); }
    catch { cache = emptyState(); }
    return cache;
  }

  async function persist(state) {
    await mkdir(dirname(file), { recursive: true, mode: 0o700 });
    const temp = file + "." + process.pid + "." + randomUUID() + ".tmp";
    await writeFile(temp, JSON.stringify(state, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
    await rename(temp, file);
  }

  function mutate(operation) {
    const task = queue.then(async () => {
      const state = await load();
      const result = operation(state);
      await persist(state);
      return result;
    });
    queue = task.catch(() => {});
    return task;
  }

  async function snapshot(root) {
    await queue;
    const state = await load();
    return {
      workspace: cleanWorkspace(state.workspaces[root]),
      recent: state.recent.map((recentRoot) => ({ root: recentRoot, ...cleanWorkspace(state.workspaces[recentRoot]) }))
    };
  }

  function updateWorkspace(root, patch = {}) {
    return mutate((state) => {
      const previous = cleanWorkspace(state.workspaces[root]);
      const next = cleanWorkspace({
        ...previous,
        ...patch,
        positions: { ...previous.positions, ...(patch.positions || {}) },
        missingFiles: { ...previous.missingFiles, ...(patch.missingFiles || {}) },
        favorites: patch.favorites === undefined ? previous.favorites : patch.favorites,
        readLater: patch.readLater === undefined ? previous.readLater : patch.readLater,
        annotations: patch.annotations === undefined ? previous.annotations : patch.annotations,
        fileMeta: { ...previous.fileMeta, ...(patch.fileMeta || {}) },
        lastOpenedAt: patch.lastOpenedAt ?? now()
      });
      state.workspaces[root] = next;
      state.recent = [root, ...state.recent.filter((entry) => entry !== root)].slice(0, MAX_RECENTS);
      return cleanWorkspace(next);
    });
  }

  return { file, snapshot, updateWorkspace };
}
