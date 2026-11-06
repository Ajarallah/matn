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

test("mdBook prefix chapters and part titles are read", () => {
  const chapters = BookCore.parseSummary(`# Summary

[المقدمة](intro.md)

# الجزء الأول

- [البداية](start.md)
  - [التفاصيل](start/details.md)

# الجزء الثاني

- [النهاية](end.md)

[ملحق](appendix.md)
`);
  assert.deepEqual(chapters.map((c) => [c.title, c.part || "", c.depth]), [
    ["المقدمة", "", 0],
    ["البداية", "الجزء الأول", 0],
    ["التفاصيل", "الجزء الأول", 1],
    ["النهاية", "الجزء الثاني", 0],
    ["ملحق", "الجزء الثاني", 0],
  ]);
});
