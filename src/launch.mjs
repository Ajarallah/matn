// Find or start the Matn instance that can serve a target, then show the target in it.
// Shared by `matn <file>`, `matn review` and the agent hooks.

import { spawn } from "node:child_process";
import { existsSync, statSync, realpathSync } from "node:fs";
import { resolve, sep } from "node:path";
import { createConnection } from "node:net";
import { startServer } from "./server.mjs";

export const hostForUrl = (h) => (h === "0.0.0.0" ? "localhost" : h);

export function openBrowser(url) {
  if (process.env.MATN_NO_OPEN) return;
  const cmd = process.platform === "darwin" ? ["open", [url]]
    : process.platform === "win32" ? ["cmd", ["/c", "start", "", url]]
    : ["xdg-open", [url]];
  try { spawn(cmd[0], cmd[1], { detached: true, stdio: "ignore" }).unref(); } catch {}
}

export function targetUrl(base, target) {
  if (!target) return base + "/";
  const abs = resolve(target);
  if (!existsSync(abs)) return base + "/";
  const key = statSync(abs).isDirectory() ? "dir" : "path";
  return base + "/?" + key + "=" + encodeURIComponent(abs);
}

function portInUse(host, port) {
  return new Promise((res) => {
    const s = createConnection({ host, port });
    s.once("connect", () => { s.destroy(); res(true); });
    s.once("error", () => res(false));
    setTimeout(() => { s.destroy(); res(false); }, 700);
  });
}

async function runningRoot(host, port) {
  try {
    const r = await fetch(`http://${hostForUrl(host)}:${port}/api/root`, { signal: AbortSignal.timeout(700) });
    const j = await r.json();
    return j && j.root ? j.root : null;
  } catch { return null; }
}

function withinRoot(root, target) {
  try {
    const t = realpathSync(resolve(target));
    return t === root || t.startsWith(root + sep);
  } catch { return false; }
}

// Ask the pages of a running instance to show `file`. Resolves to how many listened.
export async function follow(base, file, extra = {}) {
  try {
    const r = await fetch(base + "/api/follow", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path: resolve(file), ...extra }), signal: AbortSignal.timeout(1500) });
    if (!r.ok) return 0;
    return Number((await r.json()).delivered) || 0;
  } catch { return 0; }
}

// Servers this process started, so a caller that is not about to exit can close them.
export const started = new Set();

// Reuse any running instance in the port range whose root contains the target (one reader
// per folder, not one per command); otherwise start a contained instance on the first free
// port at or after the requested one.
export async function findInstance(target, { port = 4711, host = "127.0.0.1", span = 16 } = {}) {
  const abs = resolve(target || ".");
  let free = null;
  for (let p = port; p < port + span; p++) {
    if (!(await portInUse(host, p))) { if (free == null) free = p; continue; }
    const root = await runningRoot(host, p);
    if (root && withinRoot(root, abs)) return { port: p, reused: true };
  }
  if (free == null) { free = port + span; while (free < port + 64 && (await portInUse(host, free))) free++; }
  return { port: free, reused: false };
}

export async function launch({ target, port = 4711, host = "127.0.0.1", editor = "", allowFileActions = false }) {
  const defaultArg = resolve(target || ".");
  const found = await findInstance(defaultArg, { port, host });
  const reused = found.reused;
  port = found.port;
  if (!reused) started.add(await startServer({ port, host, defaultArg, editor, allowFileActions, dataDir: process.env.MATN_DATA_DIR || undefined }));
  return { base: `http://${hostForUrl(host)}:${port}`, reused, defaultArg };
}
