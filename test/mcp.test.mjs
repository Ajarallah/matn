import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { handle, callTool } from "../src/mcp.mjs";

test("the MCP server speaks JSON-RPC over stdio: initialize, list tools, call one", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "matn-mcp-")), home = await mkdtemp(join(tmpdir(), "matn-mcp-home-"));
  t.after(() => Promise.all([rm(dir, { recursive: true, force: true }), rm(home, { recursive: true, force: true })]));
  const plan = join(dir, "plan.md");
  await writeFile(plan, "# خطة\n\nخطوة أولى.\n");
  const child = spawn(process.execPath, [fileURLToPath(new URL("../bin/matn.mjs", import.meta.url)), "mcp"], { env: { ...process.env, HOME: home, XDG_DATA_HOME: home } });
  let out = "";
  child.stdout.on("data", (d) => { out += d; });
  const send = (message) => child.stdin.write(JSON.stringify(message) + "\n");
  const answer = async (id) => { for (let i = 0; i < 200; i++) { const line = out.split("\n").find((l) => l.includes(`"id":${id},`)); if (line) return JSON.parse(line); await new Promise((r) => setTimeout(r, 25)); } throw new Error("no answer " + id + ": " + out); };
  send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } } });
  assert.equal((await answer(1)).result.serverInfo.name, "matn");
  send({ jsonrpc: "2.0", method: "notifications/initialized" });
  send({ jsonrpc: "2.0", id: 2, method: "tools/list" });
  assert.deepEqual((await answer(2)).result.tools.map((tool) => tool.name), ["matn_open", "matn_review", "matn_changes"]);
  send({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "matn_changes", arguments: { path: plan } } });
  const changed = await answer(3);
  assert.equal(changed.result.isError, undefined);
  assert.match(changed.result.content[0].text, /plan\.md/);
  send({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "matn_open", arguments: { path: join(dir, "notes.json") } } });
  assert.equal((await answer(4)).result.isError, true, "not a Markdown file is an error the agent can read");
  child.stdin.end();
  await new Promise((r) => child.on("exit", r));
  assert.ok(out.split("\n").filter(Boolean).every((line) => JSON.parse(line).jsonrpc === "2.0"), "stdout carries only protocol messages");
});

test("a review through MCP returns the notes, the decision, or a plain 'no answer'", async () => {
  const dir = await mkdtemp(join(tmpdir(), "matn-mcp-r-")), plan = join(dir, "p.md");
  await writeFile(plan, "# p\n");
  assert.equal(await callTool("matn_review", { path: plan }, { review: async () => ({ decision: "send", markdown: "# Review\n" }) }), "# Review");
  assert.match(await callTool("matn_review", { path: plan, gate: true }, { review: async () => ({ decision: "approve", markdown: "" }) }), /^Decision: approve/);
  assert.match(await callTool("matn_review", { path: plan }, { review: async () => null }), /No answer/);
  assert.equal((await handle({ jsonrpc: "2.0", id: 9, method: "nope" })).error.code, -32601);
  await rm(dir, { recursive: true, force: true });
});
