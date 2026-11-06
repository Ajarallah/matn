import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

// Claude Code puts the plugin's bin/ on the Bash tool's PATH under each file's own name. A
// command that calls a name bin/ does not hold fails for everyone who installed only the plugin.
test("every plugin command calls an executable the plugin ships in bin/", () => {
  for (const file of readdirSync(new URL("commands/", root))) {
    const tools = /^allowed-tools:\s*(.+)$/m.exec(read(`commands/${file}`))?.[1] || "";
    for (const [, name] of tools.matchAll(/Bash\(([\w.-]+):/g)) {
      const bin = new URL(`bin/${name}`, root);
      assert.ok(existsSync(bin), `${file} calls ${name}, which bin/ does not have`);
      assert.ok(statSync(bin).mode & 0o111, `bin/${name} is not executable`);
    }
  }
});

test("hooks point at files that exist, and the plugin and package share one version", () => {
  const hooks = JSON.stringify(JSON.parse(read("hooks/hooks.json")));
  for (const [, path] of hooks.matchAll(/\$\{CLAUDE_PLUGIN_ROOT\}\/([\w./-]+)/g)) assert.ok(existsSync(new URL(path, root)), path);
  assert.equal(JSON.parse(read(".claude-plugin/plugin.json")).version, JSON.parse(read("package.json")).version);
});
