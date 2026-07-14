import test from "node:test";
import assert from "node:assert/strict";
import BookCore from "../src/book-core.cjs";

test("parses nested mdBook chapters and ignores external links and code", () => {
  const chapters = BookCore.parseSummary(`# Summary

- [البداية](README.md)
  - [التثبيت](<docs/دليل التثبيت.md#ابدأ>)
- [External](https://example.com)

\`\`\`md
- [Hidden](secret.md)
\`\`\`
`);
  assert.deepEqual(chapters, [
    { title: "البداية", target: "README.md", depth: 0, line: 3 },
    { title: "التثبيت", target: "docs/دليل التثبيت.md#ابدأ", depth: 1, line: 4 },
  ]);
});
