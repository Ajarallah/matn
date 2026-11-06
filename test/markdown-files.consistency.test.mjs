import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import MarkdownFiles from "../src/markdown-files.cjs";

// The list of Markdown extensions is written out in four places; they must agree, or a file
// Finder hands to Matn is refused, or the README promises what the reader does not open.
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const expected = [...MarkdownFiles.MARKDOWN_EXTENSIONS].sort();

test("the installer, the page and both READMEs list the reader's Markdown extensions", () => {
  assert.deepEqual(/EXTENSIONS=\(([^)]*)\)/.exec(read("scripts/install-macos.sh"))[1].split(/\s+/).sort(), expected);
  assert.deepEqual(/MARKDOWN_SUFFIX="\(\?:([^)]*)\)"/.exec(read("src/index.html"))[1].split("|").sort(), expected);
  for (const readme of ["README.md", "README.en.md"]) {
    const listed = new Set([...read(readme).matchAll(/`\.([a-z]+)`/g)].map((m) => m[1]));
    for (const ext of expected) assert.ok(listed.has(ext), `${readme} does not mention .${ext}`);
  }
});
