#!/usr/bin/env node
// Matn CLI — open a Markdown file or folder in the RTL reader.
//   matn [file|dir] [--port N] [--host H] [--no-open]

import { spawn } from "node:child_process";
import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createConnection } from "node:net";
import { startServer } from "../src/server.mjs";

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const VERSION = JSON.parse(readFileSync(join(PKG, "package.json"), "utf8")).version;

function parseArgs(argv) {
  const o = { port: 4711, host: "127.0.0.1", open: true, target: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--port" || a === "-p") o.port = Number(argv[++i]) || o.port;
    else if (a === "--host") o.host = argv[++i] || o.host;
    else if (a === "--no-open") o.open = false;
    else if (a === "--help" || a === "-h") o.help = true;
    else if (a === "--version" || a === "-v") o.version = true;
    else if (!a.startsWith("-") && !o.target) o.target = a;
  }
  return o;
}

const HELP = `متن — Matn  ·  a right-to-left Markdown reader for Arabic

Usage:
  matn [file|dir]          open a .md file, or a folder to browse
  matn                     open the current directory

Options:
  -p, --port <n>           port (default 4711)
      --host <h>           bind host (default 127.0.0.1)
      --no-open            don't open the browser
  -h, --help               show this help
  -v, --version            show version

Examples:
  matn README.md
  matn ./docs
  matn PLAN.md --port 5000

In the browser: click the gear for theme, Arabic font, size, line-height & width.
Drag any .md onto the window to open it. The view live-reloads on save.`;

function openBrowser(url) {
  const cmd = process.platform === "darwin" ? ["open", [url]]
    : process.platform === "win32" ? ["cmd", ["/c", "start", "", url]]
    : ["xdg-open", [url]];
  try { spawn(cmd[0], cmd[1], { detached: true, stdio: "ignore" }).unref(); } catch {}
}

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

const o = parseArgs(process.argv.slice(2));
if (o.help) { console.log(HELP); process.exit(0); }
if (o.version) { console.log("matn v" + VERSION); process.exit(0); }

const base = `http://${o.host === "0.0.0.0" ? "localhost" : o.host}:${o.port}`;
const url = targetUrl(base, o.target);
const defaultArg = resolve(o.target || ".");

const busy = await portInUse(o.host, o.port);
if (busy) {
  // Reuse the running instance — just open the requested file in it.
  if (o.open) openBrowser(url);
  console.log("[matn] reusing instance on " + base);
  console.log("[matn] " + url);
  process.exit(0);
}

await startServer({ port: o.port, host: o.host, defaultArg });
console.log("متن — Matn  ·  " + base);
if (existsSync(defaultArg)) console.log("[matn] " + (statSync(defaultArg).isDirectory() ? "folder" : "file") + ": " + defaultArg);
console.log("[matn] Ctrl+C to stop");
if (o.open) openBrowser(url);
