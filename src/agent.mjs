// Matn for coding agents: the review loop, per-reader changes, saved replies and the
// Claude Code hook entry points. Hooks fail open — any error prints nothing, so the
// agent falls back to its own behaviour and is never blocked by Matn.

import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { existsSync, realpathSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { createStateStore, defaultDataDir } from "./state-store.mjs";
import { createStdinSession } from "./stdin-session.mjs";
import { launch, follow, findInstance, openBrowser, targetUrl } from "./launch.mjs";

const require = createRequire(import.meta.url);
const RenderCore = require("./render-core.cjs");
const MATN_BIN = join(dirname(fileURLToPath(import.meta.url)), "..", "bin", "matn.mjs");
const MD_FILE = /\.(md|markdown|mdown|mkdn|mkd|mdwn|mdtxt|mdtext|rmd|qmd|mdc|mdx)$/i;

export const dataDir = () => process.env.MATN_DATA_DIR || defaultDataDir();

// ---- options ---------------------------------------------------------------

export const DEFAULT_OPTIONS = { gate: "on", follow: "off", replies: "save" };
const CHOICES = { gate: ["on", "off"], follow: ["on", "off"], replies: ["save", "arabic", "off"] };

export async function readOptions(dir = dataDir()) {
  try { return { ...DEFAULT_OPTIONS, ...pickOptions(JSON.parse(await readFile(join(dir, "agent.json"), "utf8"))) }; }
  catch { return { ...DEFAULT_OPTIONS }; }
}
function pickOptions(input) {
  const out = {};
  for (const key of Object.keys(CHOICES)) if (input && CHOICES[key].includes(input[key])) out[key] = input[key];
  return out;
}
// `pairs` is the argument list after `matn agent`: gate off follow on …
export async function setOptions(pairs, dir = dataDir()) {
  const next = await readOptions(dir);
  for (let i = 0; i < pairs.length; i += 2) {
    const key = pairs[i], value = pairs[i + 1];
    if (!CHOICES[key] || !CHOICES[key].includes(value)) throw new Error(`unknown option "${key} ${value || ""}". Choices: ` + Object.entries(CHOICES).map(([k, v]) => `${k} ${v.join("|")}`).join(", "));
    next[key] = value;
  }
  await atomicWrite(join(dir, "agent.json"), JSON.stringify(next, null, 2) + "\n");
  return next;
}
async function atomicWrite(file, text) {
  await mkdir(dirname(file), { recursive: true, mode: 0o700 });
  const temp = file + "." + process.pid + "." + randomBytes(4).toString("hex") + ".tmp";
  await writeFile(temp, text, { encoding: "utf8", mode: 0o600 });
  await rename(temp, file);
}

// ---- review ----------------------------------------------------------------

// Open `file` for review and wait for the reader's decision. Resolves to
// { decision, markdown }, or null when the deadline passes first.
export async function runReview({ file, gate = false, timeoutMs = 0, open = true, port = 4711, log = () => {} }) {
  const id = randomBytes(16).toString("hex");
  const { base, reused } = await launch({ target: file, port });
  const url = targetUrl(base, file) + "&review=" + id + (gate ? "&gate=1" : "");
  // a reader already open on this folder moves itself to the review; no new tab per round
  const shownInOpenPage = reused && (await follow(base, file, { review: id, gate })) > 0;
  if (open && !shownInOpenPage) openBrowser(url);
  log("[matn] " + url);
  log("[matn] waiting for your review in the reader");
  const started = Date.now(), deadline = timeoutMs ? started + timeoutMs : Infinity;
  while (Date.now() < deadline) {
    let response = null;
    try { response = await fetch(`${base}/api/review-wait?id=${id}`, { signal: AbortSignal.timeout(Math.min(15000, Math.max(1000, deadline - Date.now()))) }); }
    catch { if (Date.now() < deadline) await new Promise((r) => setTimeout(r, 1000)); }
    if (response && response.status === 200) return await response.json();
    if (response && response.status !== 204) throw new Error("review failed: HTTP " + response.status);
    if (await reviewAbandoned(base, id, started)) { log("[matn] the review page was closed; no answer was given"); return null; }
  }
  return null;
}

// Nobody is looking at the review: the page said it left and did not come back (a reload
// comes back within seconds), or it never arrived, or it has been silent longer than a
// background tab's throttled timers allow.
export function abandoned({ seen, gone, now }, started, { arrive = 90000, silent = 300000, grace = 8000 } = {}) {
  if (gone && gone >= seen && now - gone > grace) return true;
  if (!seen) return now - started > arrive;
  return now - seen > silent;
}
async function reviewAbandoned(base, id, started) {
  try {
    const response = await fetch(`${base}/api/review-presence?id=${id}`, { signal: AbortSignal.timeout(3000) });
    return response.ok && abandoned(await response.json(), started);
  } catch { return false; }
}

// ---- plan gate -------------------------------------------------------------

export function planGateOutput(toolInput, result) {
  if (!result) return null;
  const input = toolInput && typeof toolInput === "object" ? toolInput : {};
  const hasNotes = /^## \d+\./m.test(result.markdown || "");
  if (result.decision === "changes") {
    return { hookSpecificOutput: { hookEventName: "PermissionRequest", decision: { behavior: "deny",
      message: (result.markdown || "").trim() + "\n\nThe reviewer asked for changes in Matn. Revise the plan to address every note above, then call ExitPlanMode again." } } };
  }
  if (result.decision === "approve") {
    const updatedInput = { ...input };
    if (hasNotes && typeof input.plan === "string") updatedInput.plan = input.plan.trimEnd() + "\n\n## Reviewer notes\n\nApproved in Matn with these notes; follow them while you implement.\n\n" + result.markdown.replace(/^# Review:.*\n+/, "");
    return { hookSpecificOutput: { hookEventName: "PermissionRequest", decision: { behavior: "allow", updatedInput } } };
  }
  return null;
}

async function planGate(payload) {
  const options = await readOptions();
  if (options.gate !== "on") return null;
  const input = payload.tool_input || {};
  let file = typeof input.planFilePath === "string" && existsSync(input.planFilePath) ? input.planFilePath : null;
  if (!file) {
    if (typeof input.plan !== "string" || !input.plan.trim()) return null;
    file = (await createStdinSession(input.plan, { name: "plan.md" })).file;
  }
  // The plans folder gets a reader of its own that outlives this hook, so the next round
  // reuses its tab instead of opening another.
  if (!(await findInstance(file)).reused) { showDetached(dirname(file), ["--no-open"]); await waitForInstance(file); }
  const result = await runReview({ file, gate: true, timeoutMs: 1780 * 1000, log: (line) => console.error(line) });
  return planGateOutput(input, result);
}

// ---- follow ----------------------------------------------------------------

// Show `file` in Matn without blocking: reuse an open page when one can serve it.
export function showDetached(file, args = []) {
  const child = spawn(process.execPath, [MATN_BIN, file, ...args], { detached: true, stdio: "ignore" });
  child.unref();
}
async function waitForInstance(file, ms = 4000) {
  const until = Date.now() + ms;
  while (Date.now() < until) { if ((await findInstance(file)).reused) return true; await new Promise((r) => setTimeout(r, 100)); }
  return false;
}

async function followHook(payload) {
  const file = payload.tool_input && payload.tool_input.file_path;
  if (typeof file !== "string" || !MD_FILE.test(file) || !existsSync(file)) return null;
  if ((await readOptions()).follow === "on") showDetached(file);
  return null;
}

// ---- replies ---------------------------------------------------------------

// The last assistant reply in a Claude Code transcript (JSONL): the text blocks of
// every assistant entry after the last real user message.
export function lastAssistantText(jsonl) {
  const parts = [];
  const lines = String(jsonl || "").split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    let entry; try { entry = JSON.parse(lines[i]); } catch { continue; }
    const message = entry && entry.message, content = message && message.content;
    if (entry.type === "user" && !entry.isSidechain && !entry.isMeta) {
      const isToolResult = Array.isArray(content) && content.length && content.every((c) => c && c.type === "tool_result");
      // command output and interruption notices are logged as user entries too
      const text = typeof content === "string" ? content : Array.isArray(content) ? content.map((c) => (c && c.text) || "").join("") : "";
      if (!isToolResult && !/^\s*(<[a-z-]+>|\[Request interrupted)/.test(text)) break;
    }
    if (entry.type === "assistant" && !entry.isSidechain && Array.isArray(content)) {
      const text = content.filter((c) => c && c.type === "text" && c.text).map((c) => c.text).join("\n\n");
      if (text.trim()) parts.unshift(text.trim());
    }
  }
  return parts.join("\n\n");
}

export function arabicShare(text) {
  const letters = String(text || "").match(/\p{L}/gu) || [];
  if (!letters.length) return 0;
  return letters.filter((c) => /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/.test(c)).length / letters.length;
}

export const replyFile = (dir = dataDir()) => join(dir, "replies", "latest.md");

async function replyHook(payload) {
  const options = await readOptions();
  if (options.replies === "off") return null;
  let text = typeof payload.last_assistant_message === "string" ? payload.last_assistant_message : "";
  if (!text.trim() && typeof payload.transcript_path === "string") {
    try { text = lastAssistantText(await readFile(payload.transcript_path, "utf8")); } catch {}
  }
  if (!text.trim()) return null;
  const file = replyFile();
  await atomicWrite(file, text.trim() + "\n");
  if (options.replies === "arabic" && text.length > 200 && arabicShare(text) >= 0.3) showDetached(file);
  return null;
}

// ---- hooks -----------------------------------------------------------------

const HOOKS = { "plan-gate": planGate, follow: followHook, reply: replyHook };

export async function runHook(name, stdinText) {
  try {
    const hook = HOOKS[name];
    if (!hook) return "";
    const out = await hook(JSON.parse(stdinText || "{}"));
    return out ? JSON.stringify(out) : "";
  } catch { return ""; }
}

// ---- changes per reader ----------------------------------------------------

const readerKey = (real, reader) => real + "\0reader:" + reader;
const quote = (src) => src.trim().split(/\r?\n/).map((line) => "> " + line).join("\n");

export function changesReport(name, reader, before, after) {
  if (before == null) return `# ${name}\n\n${reader} has no earlier copy of this file. Run with --mark after reading it, and the next run lists what changed.\n`;
  const diff = RenderCore.blockDiff(before, after);
  if (!diff.count) return `# ${name}\n\nNo changes since ${reader} last read it.\n`;
  const out = [`# Changes in ${name} since ${reader} last read it`, ""];
  let at = 0;
  const lineOf = (src) => { const i = after.indexOf(src, at); if (i < 0) return 0; at = i; return after.slice(0, i).split("\n").length; };
  diff.blocks.forEach((block, index) => {
    const line = lineOf(block.src);
    for (const gone of diff.removed.filter((r) => r.at === index)) out.push(`## Removed (before line ${line || "end"})`, "", quote(gone.src), "");
    if (block.status === "added") out.push(`## Added at line ${line}`, "", quote(block.src), "");
    if (block.status === "changed") out.push(`## Edited at line ${line}`, "", "Was:", "", quote(block.old), "", "Now:", "", quote(block.src), "");
  });
  for (const gone of diff.removed.filter((r) => r.at >= diff.blocks.length)) out.push("## Removed (at the end)", "", quote(gone.src), "");
  return out.join("\n");
}

export async function changes(file, { reader = "agent", mark = false } = {}) {
  const real = realpathSync(resolve(file));
  if (statSync(real).size > 16 * 1024 * 1024) throw new Error("file too large");
  const store = createStateStore({ dataDir: dataDir() });
  const now = readFileSync(real, "utf8");
  const report = changesReport(basename(real), reader, await store.readSeen(readerKey(real, reader)), now);
  if (mark) await store.writeSeen(readerKey(real, reader), now);
  return report;
}

// ---- setup -----------------------------------------------------------------

export async function setupCodex(home = process.env.HOME || "") {
  const source = join(dirname(fileURLToPath(import.meta.url)), "..", "skills", "matn", "SKILL.md");
  const target = join(home, ".agents", "skills", "matn", "SKILL.md");
  await atomicWrite(target, readFileSync(source, "utf8"));
  return target;
}

