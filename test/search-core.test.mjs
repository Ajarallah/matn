import test from "node:test";
import assert from "node:assert/strict";
import searchCore from "../src/search-core.cjs";

test("normalizeSearch handles Arabic diacritics, tatweel, alef, and ya variants", () => {
  assert.equal(searchCore.normalizeSearch("خُـطَّة"), "خطة");
  assert.equal(searchCore.normalizeSearch("إلى آفاق أُخرى"), "الي افاق اخري");
  assert.equal(searchCore.normalizeSearch("Markdown API"), "markdown api");
});

test("createRecord extracts frontmatter title and aliases", () => {
  const record = searchCore.createRecord({
    path: "/notes/plan.md",
    rel: "notes/plan.md",
    mtimeMs: 10,
    content: "---\ntitle: خُطّة العمل\naliases: [مشروع, Project Alpha]\n---\n# مقدمة\nنص الوثيقة"
  });
  assert.equal(record.title, "خُطّة العمل");
  assert.deepEqual(record.aliases, ["مشروع", "Project Alpha"]);

  const listAliases = searchCore.createRecord({
    path: "/notes/list.md", rel: "notes/list.md", mtimeMs: 1,
    content: "---\ntitle: قائمة\naliases:\n  - الاسم الأول\n  - Second name\n---\nالمحتوى"
  });
  assert.deepEqual(listAliases.aliases, ["الاسم الأول", "Second name"]);
});

test("searchRecords ranks title and alias matches and returns content snippets", () => {
  const records = [
    searchCore.createRecord({
      path: "/a.md",
      rel: "a.md",
      mtimeMs: 1,
      content: "---\ntitle: خُطّة العمل\naliases: [مشروع ألفا]\n---\n# مقدمة\nتفاصيل عادية"
    }),
    searchCore.createRecord({
      path: "/b.md",
      rel: "docs/b.md",
      mtimeMs: 2,
      content: "# دليل الاستخدام\nهذه التجربة تشرح البحث العربي بصورة عملية ومباشرة."
    })
  ];

  assert.equal(searchCore.searchRecords(records, "خطة", { mode: "all" })[0].path, "/a.md");
  assert.equal(searchCore.searchRecords(records, "مشروع الفا", { mode: "all" })[0].path, "/a.md");
  const content = searchCore.searchRecords(records, "التجربة", { mode: "all" });
  assert.equal(content[0].path, "/b.md");
  assert.match(content[0].snippet, /التجربة/);
  assert.deepEqual(searchCore.searchRecords(records, "التجربة", { mode: "files" }), []);
});

test("snippets preserve ordinary horizontal rules", () => {
  const record = searchCore.createRecord({
    path: "/rule.md", rel: "rule.md", mtimeMs: 1,
    content: "# قبل\nفقرة أولى\n\n---\n\n## بعد\nالكلمة المطلوبة هنا"
  });
  const result = searchCore.searchRecords([record], "المطلوبة", { mode: "all" })[0];
  assert.match(result.snippet, /بعد/);
  assert.match(result.snippet, /المطلوبة/);
});
