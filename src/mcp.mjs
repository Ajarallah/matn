// `matn mcp`: Matn as an MCP server over stdio, for agents that cannot run shell commands
// (Claude Desktop and other chat apps). Three tools mirror the CLI: open a file, ask the
// reader to review it and wait for the notes, and list what changed since the agent last read.
// Newline-delimited JSON-RPC 2.0, no SDK, no dependencies.

import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import { runReview, changes, showDetached } from "./agent.mjs";
import MarkdownFiles from "./markdown-files.cjs";

const PROTOCOL = "2025-06-18";
const file = { type: "string", description: "Absolute path of a Markdown file" };
export const TOOLS = [
  { name: "matn_open", description: "Show a Markdown file to the user in Matn, a reader that renders Arabic and mixed right-to-left text correctly.", inputSchema: { type: "object", properties: { path: file }, required: ["path"] } },
  { name: "matn_review", description: "Open a Markdown file (a plan, spec or report) in Matn for the user to review, and wait until they send their notes. Returns the notes as Markdown: each quotes the text it is about, gives its line, and may carry a suggested replacement. With gate, the user approves or requests changes.", inputSchema: { type: "object", properties: { path: file, gate: { type: "boolean", description: "Offer Approve / Request changes" }, timeoutSeconds: { type: "number", description: "Give up after this many seconds (default 1800)" } }, required: ["path"] } },
  { name: "matn_changes", description: "List the blocks added, edited and removed in a Markdown file since the agent last read it, then record it as read.", inputSchema: { type: "object", properties: { path: file }, required: ["path"] } }
];

function markdownFile(path) {
  const abs = resolve(String(path || ""));
  if (!existsSync(abs) || !statSync(abs).isFile() || !MarkdownFiles.isMarkdownPath(abs)) throw new Error(`not a Markdown file: ${path}`);
  return abs;
}

export async function callTool(name, args = {}, { review = runReview, open = showDetached } = {}) {
  if (name === "matn_open") { const abs = markdownFile(args.path); open(abs); return `Opened ${abs} in Matn.`; }
  if (name === "matn_changes") return changes(markdownFile(args.path), { reader: "agent", mark: true });
  if (name === "matn_review") {
    const result = await review({ file: markdownFile(args.path), gate: Boolean(args.gate), timeoutMs: Math.max(10, Number(args.timeoutSeconds) || 1800) * 1000 });
    if (!result) return "No answer: the reader closed the page or the time ran out. Ask the user before opening it again.";
    return args.gate ? `Decision: ${result.decision}\n\n${result.markdown || ""}`.trim() : String(result.markdown || "").trim();
  }
  throw Object.assign(new Error(`unknown tool: ${name}`), { code: -32602 });
}

export async function handle(message, deps) {
  const { id, method, params = {} } = message || {};
  const reply = (result) => ({ jsonrpc: "2.0", id, result });
  if (method === "initialize") return reply({ protocolVersion: params.protocolVersion || PROTOCOL, capabilities: { tools: {} }, serverInfo: { name: "matn", version: deps?.version || "0" } });
  if (method === "tools/list") return reply({ tools: TOOLS });
  if (method === "tools/call") {
    try { return reply({ content: [{ type: "text", text: await callTool(params.name, params.arguments || {}, deps) }] }); }
    catch (error) { return reply({ content: [{ type: "text", text: error.message }], isError: true }); }
  }
  if (method === "ping") return reply({});
  if (id === undefined) return null; // notifications (initialized, cancelled) need no answer
  return { jsonrpc: "2.0", id, error: { code: -32601, message: `method not found: ${method}` } };
}

export function serve({ input = process.stdin, output = process.stdout, version } = {}) {
  const lines = createInterface({ input });
  lines.on("line", async (line) => {
    if (!line.trim()) return;
    let message;
    try { message = JSON.parse(line); } catch { output.write(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } }) + "\n"); return; }
    const answer = await handle(message, { version });
    if (answer) output.write(JSON.stringify(answer) + "\n");
  });
  return new Promise((done) => lines.on("close", done));
}
