import test from "node:test";
import assert from "node:assert/strict";
import { createPlatformActions } from "../src/platform-actions.mjs";

test("macOS actions use Finder trash and direct argument arrays", async () => {
  const calls = [];
  const actions = createPlatformActions({ platform: "darwin", editor: "/usr/bin/code", run: async (...args) => calls.push(args) });
  await actions.trash("/vault/a'; rm -rf /.md");
  await actions.reveal("/vault/a.md");
  await actions.openEditor("/vault/a.md");
  assert.equal(calls[0][0], "osascript");
  assert.equal(calls[0][1].at(-1), "/vault/a'; rm -rf /.md");
  assert.equal(calls[1][0], "open");
  assert.deepEqual(calls[2].slice(0, 2), ["/usr/bin/code", ["/vault/a.md"]]);
  assert.equal(calls.some((call) => /\b(?:rm|unlink)\b/.test(call[0])), false);
});

test("Linux and Windows trash adapters target the OS recycle mechanism", async () => {
  const linux = [], windows = [];
  await createPlatformActions({ platform: "linux", run: async (...args) => linux.push(args) }).trash("/vault/a.md");
  await createPlatformActions({ platform: "win32", run: async (...args) => windows.push(args) }).trash("C:\\vault\\a.md");
  assert.deepEqual(linux[0].slice(0, 2), ["gio", ["trash", "--", "/vault/a.md"]]);
  assert.equal(windows[0][0], "powershell.exe");
  assert.match(windows[0][1].join(" "), /SendToRecycleBin/);
  assert.equal(windows[0][2].env.MATN_TARGET, "C:\\vault\\a.md");
});

test("opening an editor fails closed when none is configured", async () => {
  await assert.rejects(createPlatformActions({ run: async () => {} }).openEditor("/vault/a.md"), (error) => error.code === "ENOEDITOR");
});
