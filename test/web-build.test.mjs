import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// the web build's boot script lives in a template literal; a lost backslash breaks the whole page
const html = readFileSync(new URL("../docs/index.html", import.meta.url), "utf8");
const source = /function rawUrlFor[\s\S]*?\n  return null;\}/.exec(html)[0];
const rawUrlFor = new Function(`${source}; return rawUrlFor;`)();
const open = (query) => rawUrlFor(new URLSearchParams(query));

test("the web version opens public Markdown by GitHub repo or URL", () => {
  assert.equal(open("gh=Ajarallah/matn"), "https://raw.githubusercontent.com/Ajarallah/matn/HEAD/README.md");
  assert.equal(open("gh=owner/repo/docs/guide.md"), "https://raw.githubusercontent.com/owner/repo/HEAD/docs/guide.md");
  assert.equal(open("url=https://github.com/o/r/blob/main/a.md"), "https://raw.githubusercontent.com/o/r/main/a.md");
  assert.equal(open("url=https://example.com/x.md"), "https://example.com/x.md");
  assert.equal(open("url=javascript:alert(1)"), null);
  assert.equal(open("gh=../../etc"), null);
  assert.equal(open(""), null);
});
