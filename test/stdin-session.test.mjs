import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import {
  cleanupStdinSessions,
  createStdinSession,
  readStdin,
  safeSessionName,
  SESSION_PREFIX,
} from "../src/stdin-session.mjs";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));

test("stdin sessions reject empty and oversized input and sanitize display names", async () => {
  await assert.rejects(readStdin(Readable.from([])), { code: "EEMPTY" });
  await assert.rejects(readStdin(Readable.from(["12345"]), 4), { code: "ETOOBIG" });
  assert.equal(safeSessionName("../تقرير نهائي.md"), "تقرير نهائي.md");
  assert.equal(safeSessionName("../../"), "stdin.md");
  assert.equal(safeSessionName("report.html"), "report.md");
});

test("old stdin sessions are removed without touching unrelated temporary folders", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "matn-stdin-cleanup-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const old = join(root, SESSION_PREFIX + "old"), unrelated = join(root, "unrelated");
  await mkdir(old);
  await mkdir(unrelated);
  await writeFile(join(old, "stdin.md"), "old");
  const past = new Date(Date.now() - 48 * 60 * 60 * 1000);
  await utimes(old, past, past);
  await cleanupStdinSessions({ tempRoot: root, maxAgeMs: 24 * 60 * 60 * 1000 });
  assert.equal(existsSync(old), false);
  assert.equal(existsSync(unrelated), true);
});

test("matn reads stdin through an isolated session and removes it on shutdown", async (t) => {
  const probe = createServer();
  await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const port = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  const child = spawn(process.execPath, ["bin/matn.mjs", "-", "--no-open", "--port", String(port), "--stdin-name", "../تقرير.md"], {
    cwd: projectRoot,
    stdio: ["pipe", "pipe", "pipe"],
  });
  t.after(() => { if (child.exitCode == null) child.kill("SIGTERM"); });
  let stdout = "", stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.stdin.end("# تقرير من stdin\n\nمحتوى آمن.\n");
  const started = Date.now();
  while (!stdout.includes("Ctrl+C to stop") && Date.now() - started < 5000) await new Promise((resolve) => setTimeout(resolve, 20));
  assert.match(stdout, /Ctrl\+C to stop/, stderr || stdout);
  const base = `http://127.0.0.1:${port}`;
  const target = await (await fetch(`${base}/api/default`)).json();
  assert.equal(target.path.endsWith("تقرير.md"), true);
  assert.equal(await (await fetch(`${base}/api/raw?path=${encodeURIComponent(target.path)}`)).text(), "# تقرير من stdin\n\nمحتوى آمن.\n");
  const sessionDir = dirname(target.path);
  child.kill("SIGTERM");
  await once(child, "exit");
  assert.equal(existsSync(sessionDir), false);
});

test("creates a private Markdown session file", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "matn-stdin-create-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const session = await createStdinSession("# آمن", { tempRoot: root, name: "result" });
  assert.equal(session.file.endsWith("result.md"), true);
  assert.equal(existsSync(session.file), true);
});
