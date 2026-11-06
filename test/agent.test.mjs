import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.MATN_NO_OPEN = "1";
const dataDir = await mkdtemp(join(tmpdir(), "matn-agent-data-"));
process.env.MATN_DATA_DIR = dataDir;
const agent = await import("../src/agent.mjs");
const { started } = await import("../src/launch.mjs");
test.after(async () => { for (const server of started) { server.closeAllConnections?.(); await new Promise((r) => server.close(r)); } await rm(dataDir, { recursive: true, force: true }); });

const REVIEW = "# Review: plan.md\n\n1 note on this file.\n\n## 1. Line 3\n\n> ship it\n\nNot yet.\n";

test("the plan gate turns a decision into the PermissionRequest answer Claude Code expects", () => {
  const input = { plan: "# Plan\n\nship it\n", planFilePath: "/x/plan.md" };
  const deny = agent.planGateOutput(input, { decision: "changes", markdown: REVIEW });
  assert.equal(deny.hookSpecificOutput.hookEventName, "PermissionRequest");
  assert.equal(deny.hookSpecificOutput.decision.behavior, "deny");
  assert.match(deny.hookSpecificOutput.decision.message, /Not yet\.[\s\S]*call ExitPlanMode again/);

  const allow = agent.planGateOutput(input, { decision: "approve", markdown: REVIEW });
  assert.equal(allow.hookSpecificOutput.decision.behavior, "allow");
  assert.equal(allow.hookSpecificOutput.decision.updatedInput.planFilePath, "/x/plan.md");
  assert.match(allow.hookSpecificOutput.decision.updatedInput.plan, /^# Plan[\s\S]*## Reviewer notes[\s\S]*Not yet\./);

  const bare = agent.planGateOutput(input, { decision: "approve", markdown: "# Review: plan.md\n\n0 notes on this file.\n" });
  assert.equal(bare.hookSpecificOutput.decision.updatedInput.plan, input.plan);
  assert.equal(agent.planGateOutput(input, null), null, "a timeout leaves the decision to Claude Code");
});

test("hooks fail open on bad input", async () => {
  assert.equal(await agent.runHook("plan-gate", "not json"), "");
  assert.equal(await agent.runHook("nope", "{}"), "");
  assert.equal(await agent.runHook("follow", JSON.stringify({ tool_input: { file_path: "/no/such/file.md" } })), "");
});

test("the last reply is every assistant text after the last real user message", () => {
  const line = (o) => JSON.stringify(o);
  const jsonl = [
    line({ type: "user", message: { role: "user", content: [{ type: "text", text: "old question" }] } }),
    line({ type: "assistant", message: { content: [{ type: "text", text: "old answer" }] } }),
    line({ type: "user", message: { role: "user", content: "ما الخطة؟" } }),
    line({ type: "assistant", message: { content: [{ type: "text", text: "أولًا" }, { type: "tool_use", name: "Bash" }] } }),
    line({ type: "user", message: { content: [{ type: "tool_result", content: "ok" }] } }),
    line({ type: "assistant", isSidechain: true, message: { content: [{ type: "text", text: "subagent" }] } }),
    line({ type: "assistant", message: { content: [{ type: "text", text: "ثانيًا" }] } }),
    "garbage",
  ].join("\n");
  assert.equal(agent.lastAssistantText(jsonl), "أولًا\n\nثانيًا");
});

test("the reply hook saves the last reply for matn last", async () => {
  await agent.runHook("reply", JSON.stringify({ last_assistant_message: "## الجواب\n\nنص" }));
  assert.equal(await readFile(agent.replyFile(), "utf8"), "## الجواب\n\nنص\n");
  assert.ok(agent.arabicShare("مرحبا hello") >= 0.5 && agent.arabicShare("hello") === 0);
});

test("options keep defaults, accept known values and refuse unknown ones", async () => {
  assert.deepEqual(await agent.readOptions(), agent.DEFAULT_OPTIONS);
  assert.deepEqual(await agent.setOptions(["gate", "off", "replies", "arabic"]), { gate: "off", follow: "off", replies: "arabic" });
  await assert.rejects(agent.setOptions(["gate", "maybe"]), /unknown option/);
  await agent.setOptions(["gate", "on", "replies", "save"]);
});

test("changes lists what a reader has not seen, per reader", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "matn-changes-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = join(dir, "plan.md");
  await writeFile(file, "# Plan\n\nStep one.\n\nStep two.\n", "utf8");
  assert.match(await agent.changes(file, { reader: "codex", mark: true }), /no earlier copy/);
  assert.match(await agent.changes(file, { reader: "codex" }), /No changes/);
  await writeFile(file, "# Plan\n\nStep one, carefully.\n\nStep three.\n", "utf8");
  const report = await agent.changes(file, { reader: "codex" });
  assert.match(report, /## Edited at line 3[\s\S]*Was:[\s\S]*> Step one\.[\s\S]*Now:/);
  assert.match(report, /Step three/);
  assert.match(report, /Step two/);
  assert.match(await agent.changes(file, { reader: "claude" }), /no earlier copy/, "each reader keeps its own copy");
});

test("a review opens the file and returns the reader's decision", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "matn-run-review-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = join(dir, "plan.md");
  await writeFile(file, "# Plan\n", "utf8");
  let url = "";
  const port = 47000 + Math.floor(Math.random() * 1500);
  const pending = agent.runReview({ file, gate: true, open: false, port, timeoutMs: 20000, log: (line) => { if (line.includes("review=")) url = line.slice(7); } });
  while (!url) await new Promise((r) => setTimeout(r, 20));
  assert.match(url, /&gate=1$/);
  const page = new URL(url), id = page.searchParams.get("review");
  const token = /<meta name="matn-session" content="([a-f0-9]{64})">/.exec(await (await fetch(page.origin + "/")).text())[1];
  await fetch(page.origin + "/api/review", { method: "POST", headers: { "content-type": "application/json", origin: page.origin, "x-matn-session": token }, body: JSON.stringify({ id, markdown: REVIEW, decision: "approve", path: file }) });
  assert.deepEqual(await pending, { decision: "approve", markdown: REVIEW });
});
