import assert from "node:assert/strict";
import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  MATN_CODEX_SECTION,
  removeMatnCodexHandler,
  upsertMatnCodexHandler,
  writeMatnCodexHandler,
} from "../src/codex-open-in-config.mjs";

const iconPath = "/Users/test/Applications/Matn.app/Contents/Resources/matn-app-icon.svg";

test("upsertMatnCodexHandler preserves unrelated configuration", () => {
  const source = 'model = "gpt-test"\n\n[features]\napps = true\n';
  const next = upsertMatnCodexHandler(source, { iconPath });

  assert.match(next, /model = "gpt-test"/);
  assert.match(next, /\[features\]\napps = true/);
  assert.match(next, /\[custom_file_handlers\.matn\]/);
  assert.match(next, /command = "\/usr\/bin\/open"/);
  assert.match(next, /args = \["-b", "com\.ajarallah\.matn"\]/);
  assert.match(next, new RegExp(iconPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("upsertMatnCodexHandler replaces the owned section without duplicates", () => {
  const source = `${MATN_CODEX_SECTION}\nlabel = "Old"\n\n[features]\napps = true\n`;
  const next = upsertMatnCodexHandler(source, { iconPath });

  assert.equal(next.match(/\[custom_file_handlers\.matn\]/g)?.length, 1);
  assert.doesNotMatch(next, /label = "Old"/);
  assert.match(next, /\[features\]\napps = true/);
});

test("removeMatnCodexHandler removes only the Matn section", () => {
  const source = `[features]\napps = true\n\n${MATN_CODEX_SECTION}\nlabel = "Matn"\n\n[mcp_servers.test]\nurl = "https://example.com"\n`;
  const next = removeMatnCodexHandler(source);

  assert.doesNotMatch(next, /custom_file_handlers\.matn/);
  assert.match(next, /\[features\]/);
  assert.match(next, /\[mcp_servers\.test\]/);
});

test("writeMatnCodexHandler writes atomically and preserves file mode", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "matn-codex-config-"));
  const configPath = join(root, "config.toml");
  t.after(async () => {
    const { rm } = await import("node:fs/promises");
    await rm(root, { recursive: true, force: true });
  });

  await writeFile(configPath, 'model = "gpt-test"\n', { mode: 0o640 });
  const first = await writeMatnCodexHandler({ configPath, iconPath });
  const second = await writeMatnCodexHandler({ configPath, iconPath });

  assert.equal(first.changed, true);
  assert.equal(second.changed, false);
  assert.equal((await stat(configPath)).mode & 0o777, 0o640);
  assert.match(await readFile(configPath, "utf8"), /label = "Matn"/);
});
