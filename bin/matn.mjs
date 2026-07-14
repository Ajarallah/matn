#!/usr/bin/env node
// Matn CLI — open a Markdown file or folder in the RTL reader.
//   matn [file|dir] [--port N] [--host H] [--no-open]

import { spawn } from "node:child_process";
import { readFileSync, existsSync, statSync, realpathSync, rmSync } from "node:fs";
import { resolve, dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createConnection } from "node:net";
import { startServer } from "../src/server.mjs";
import { cleanupStdinSessions, createStdinSession, readStdin } from "../src/stdin-session.mjs";

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const VERSION = JSON.parse(readFileSync(join(PKG, "package.json"), "utf8")).version;

function parseArgs(argv) {
  const o = { port: 4711, host: "127.0.0.1", open: true, target: null, editor: process.env.MATN_EDITOR || "", allowFileActions: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--port" || a === "-p") o.port = Number(argv[++i]) || o.port;
    else if (a === "--host") o.host = argv[++i] || o.host;
    else if (a === "--no-open") o.open = false;
    else if (a === "--editor") o.editor = argv[++i] || "";
    else if (a === "--allow-file-actions") o.allowFileActions = true;
    else if (a === "--stdin-name") o.stdinName = argv[++i] || "stdin.md";
    else if (a === "--help" || a === "-h") o.help = true;
    else if (a === "--version" || a === "-v") o.version = true;
    else if ((a === "-" || !a.startsWith("-")) && !o.target) o.target = a;
  }
  return o;
}

const HELP = `متن — Matn  ·  a right-to-left Markdown reader for Arabic

Usage:
  matn [file|dir]          open a .md file, or a folder to browse
  command | matn -         read Markdown from stdin in a temporary session
  matn                     open the current directory

Options:
  -p, --port <n>           port (default 4711)
      --host <h>           bind host (default 127.0.0.1)
      --no-open            don't open the browser
      --editor <executable> external editor executable (or MATN_EDITOR)
      --allow-file-actions enable moving files to the OS trash
      --stdin-name <name>  display name for stdin content (default stdin.md)
  -h, --help               show this help
  -v, --version            show version

Examples:
  matn README.md
  matn ./docs
  matn PLAN.md --port 5000
  printf '# Report' | matn - --stdin-name report.md

In the browser: click the gear for theme, Arabic font, size, line-height & width.
Drag any .md onto the window to open it. The view live-reloads on save.
Mermaid diagrams, math, GFM callouts, footnotes and wikilinks all render.`;

function openBrowser(url) {
  const cmd = process.platform === "darwin" ? ["open", [url]]
    : process.platform === "win32" ? ["cmd", ["/c", "start", "", url]]
    : ["xdg-open", [url]];
  try { spawn(cmd[0], cmd[1], { detached: true, stdio: "ignore" }).unref(); } catch {}
}

const hostForUrl = (h) => (h === "0.0.0.0" ? "localhost" : h);

// Resolve which URL to open for the given target.
function targetUrl(base, target) {
  if (!target) return base + "/";
  const abs = resolve(target);
  if (!existsSync(abs)) return base + "/";
  const key = statSync(abs).isDirectory() ? "dir" : "path";
  return base + "/?" + key + "=" + encodeURIComponent(abs);
}

// Is something already listening on host:port?
function portInUse(host, port) {
  return new Promise((res) => {
    const s = createConnection({ host, port });
    s.once("connect", () => { s.destroy(); res(true); });
    s.once("error", () => res(false));
    setTimeout(() => { s.destroy(); res(false); }, 700);
  });
}

// Ask a running instance for its containment root.
async function runningRoot(host, port) {
  try {
    const r = await fetch(`http://${hostForUrl(host)}:${port}/api/root`, { signal: AbortSignal.timeout(700) });
    const j = await r.json();
    return j && j.root ? j.root : null;
  } catch { return null; }
}

// Is `target` inside `root` (both real paths)?
function withinRoot(root, target) {
  try {
    const t = realpathSync(resolve(target));
    return t === root || t.startsWith(root + sep);
  } catch { return false; }
}

const o = parseArgs(process.argv.slice(2));
if (o.help) { console.log(HELP); process.exit(0); }
if (o.version) { console.log("matn v" + VERSION); process.exit(0); }

let stdinSession = null;
if (o.target === "-") {
  try {
    await cleanupStdinSessions();
    stdinSession = await createStdinSession(await readStdin(process.stdin), { name: o.stdinName });
    o.target = stdinSession.file;
    const cleanupSession = () => { try { rmSync(stdinSession.dir, { recursive: true, force: true }); } catch {} };
    process.on("exit", cleanupSession);
    process.once("SIGINT", () => { cleanupSession(); process.exit(130); });
    process.once("SIGTERM", () => { cleanupSession(); process.exit(143); });
  } catch (error) {
    console.error("[matn] " + (error && error.message ? error.message : "could not read stdin"));
    process.exit(2);
  }
}
const defaultArg = resolve(o.target || ".");
let port = o.port;

// If the requested port is busy, reuse that instance only when it can serve the
// target (same containment root). Otherwise open a fresh, contained instance on
// the next free port — so you can read files from any folder.
if (await portInUse(o.host, port)) {
  const root = await runningRoot(o.host, port);
  if (root && withinRoot(root, defaultArg)) {
    const base = `http://${hostForUrl(o.host)}:${port}`;
    const url = targetUrl(base, o.target);
    if (o.open) openBrowser(url);
    console.log("[matn] reusing instance on " + base);
    console.log("[matn] " + url);
    process.exit(0);
  }
  let p = port + 1;
  while (p < port + 64 && (await portInUse(o.host, p))) p++;
  port = p;
}

const base = `http://${hostForUrl(o.host)}:${port}`;
const url = targetUrl(base, o.target);
await startServer({ port, host: o.host, defaultArg, editor: o.editor, allowFileActions: o.allowFileActions });
console.log("متن — Matn  ·  " + base);
if (existsSync(defaultArg)) console.log("[matn] " + (statSync(defaultArg).isDirectory() ? "folder" : "file") + ": " + defaultArg);
console.log("[matn] Ctrl+C to stop");
if (o.open) openBrowser(url);
