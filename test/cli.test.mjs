import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const BIN = fileURLToPath(new URL("../bin/matn.mjs", import.meta.url));
const run = (args, cwd) => spawnSync(process.execPath, [BIN, ...args], { cwd, encoding: "utf8", env: { ...process.env, MATN_NO_OPEN: "1" } });

test("a mistyped file is an error with suggestions, not an empty page", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "matn-cli-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(join(dir, "plan.md"), "# plan\n");
  await writeFile(join(dir, "notes.json"), "{}");
  const missing = run(["plam.md"], dir);
  assert.equal(missing.status, 2);
  assert.match(missing.stderr, /no such file or folder: plam\.md[\s\S]*did you mean: plan\.md/);
  const notMarkdown = run(["notes.json"], dir);
  assert.equal(notMarkdown.status, 2);
  assert.match(notMarkdown.stderr, /not a Markdown file: notes\.json/);
  assert.equal(run(["--version"], dir).status, 0);
});
