#!/usr/bin/env node
// Matn CLI — open a Markdown file or folder in the RTL reader.
//   matn [file|dir] [--port N] [--host H] [--no-open]

import { readFileSync, existsSync, statSync, rmSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { launch, follow, openBrowser, targetUrl } from "../src/launch.mjs";
import { runReview, runHook, changes, readOptions, setOptions, replyFile, setupCodex } from "../src/agent.mjs";
import { cleanupStdinSessions, createStdinSession, readStdin } from "../src/stdin-session.mjs";

const PKG = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const VERSION = JSON.parse(readFileSync(join(PKG, "package.json"), "utf8")).version;

function parseArgs(argv) {
  const o = { port: 4711, host: "127.0.0.1", open: true, target: null, editor: process.env.MATN_EDITOR || "", allowFileActions: false };
  if (["review", "changes", "last", "agent", "hook", "setup"].includes(argv[0])) { o.command = argv[0]; argv = argv.slice(1); }
  o.rest = argv;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--port" || a === "-p") o.port = Number(argv[++i]) || o.port;
    else if (a === "--host") o.host = argv[++i] || o.host;
    else if (a === "--no-open") o.open = false;
    else if (a === "--editor") o.editor = argv[++i] || "";
    else if (a === "--allow-file-actions") o.allowFileActions = true;
    else if (a === "--stdin-name") o.stdinName = argv[++i] || "stdin.md";
    else if (a === "--gate") o.gate = true;
    else if (a === "--json") o.json = true;
    else if (a === "--timeout") o.timeout = Number(argv[++i]) || 0;
    else if (a === "--reader") o.reader = argv[++i] || "agent";
    else if (a === "--mark") o.mark = true;
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

For coding agents:
  matn review <file>       open a file for review; print the notes to stdout when the
                           reader presses "Send to agent"
        --gate             offer Approve / Request changes instead of Send
        --json             print {"decision", "markdown"} instead of the notes
        --timeout <s>      give up after s seconds (exit 3, nothing printed)
  matn changes <file>      list what changed since a reader last marked the file
        --reader <name>    whose copy to compare with (default: agent)
        --mark             record the file as read now
  matn last                open the agent's last saved reply
  matn agent [opts]        show or set: gate on|off, follow on|off,
                           replies save|arabic|off
  matn setup codex         install the Matn skill for Codex (~/.agents/skills)
  matn hook <name>         Claude Code hook entry point (plan-gate, follow, reply)

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
const readAll = async (stream) => { const chunks = []; for await (const c of stream) chunks.push(c); return Buffer.concat(chunks).toString("utf8"); };
const fail = (message, code = 2) => { console.error("[matn] " + message); process.exit(code); };
const isFile = (p) => p && p !== "-" && existsSync(p) && statSync(p).isFile();

if (o.command === "hook") {
  const out = await runHook(o.rest[0], await readAll(process.stdin));
  if (out) process.stdout.write(out + "\n");
  process.exit(0);
}
if (o.command === "agent") {
  const pairs = o.rest.filter((a) => !a.startsWith("-"));
  try { const options = pairs.length ? await setOptions(pairs) : await readOptions(); console.log(Object.entries(options).map(([k, v]) => k + " " + v).join("\n")); }
  catch (error) { fail(error.message); }
  process.exit(0);
}
if (o.command === "setup") {
  if (o.rest[0] !== "codex") fail("usage: matn setup codex");
  console.log("[matn] installed " + await setupCodex());
  process.exit(0);
}
if (o.command === "changes") {
  if (!isFile(o.target)) fail("changes needs a Markdown file: matn changes PLAN.md");
  process.stdout.write(await changes(o.target, { reader: o.reader || "agent", mark: Boolean(o.mark) }));
  process.exit(0);
}
if (o.command === "last") {
  if (!existsSync(replyFile())) fail("no saved reply yet — install the Claude Code plugin, or set: matn agent replies save", 1);
  o.target = replyFile();
}
if (o.command === "review") {
  // stdout carries only the result, so an agent can read it as-is
  if (!isFile(o.target)) fail("review needs a Markdown file: matn review PLAN.md");
  let result = null;
  try { result = await runReview({ file: o.target, gate: Boolean(o.gate), timeoutMs: (o.timeout || 0) * 1000, open: o.open, port: o.port, log: (line) => console.error(line) }); }
  catch (error) { fail(error.message, 1); }
  if (!result) process.exit(3);
  process.stdout.write(o.json ? JSON.stringify(result) + "\n" : result.markdown);
  process.exit(0);
}

const { base, reused, defaultArg } = await launch({ target: o.target, port: o.port, host: o.host, editor: o.editor, allowFileActions: o.allowFileActions });
const url = targetUrl(base, o.target);
if (reused) {
  console.log("[matn] reusing instance on " + base);
  // a page is already open: show the file there instead of opening another tab
  if (isFile(o.target) && (await follow(base, o.target)) > 0) { console.log("[matn] shown in the open reader"); process.exit(0); }
  console.log("[matn] " + url);
  if (o.open) openBrowser(url);
  process.exit(0);
}
console.log("متن — Matn  ·  " + base);
if (existsSync(defaultArg)) console.log("[matn] " + (statSync(defaultArg).isDirectory() ? "folder" : "file") + ": " + defaultArg);
console.log("[matn] Ctrl+C to stop");
if (o.open) openBrowser(url);
