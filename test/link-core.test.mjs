import test from "node:test";
import assert from "node:assert/strict";
import LinkCore from "../src/link-core.cjs";
import SearchCore from "../src/search-core.cjs";

const records = [
  SearchCore.createRecord({ path: "/vault/README.md", rel: "README.md", content: "# البداية\nراجع [[دليل|الدليل]] و[التثبيت](docs/guide.md#التثبيت).\n```md\n[[سري]]\n```" }),
  SearchCore.createRecord({ path: "/vault/docs/guide.md", rel: "docs/guide.md", content: "---\ntitle: الدليل الكامل\naliases: [دليل]\n---\n# مقدمة\n## التثبيت\nنص" }),
  SearchCore.createRecord({ path: "/vault/docs/other.md", rel: "docs/other.md", content: "# آخر\n[الرئيسية](../README.md#البداية)" })
];

test("resolves relative markdown links, wikilink aliases, and headings", () => {
  const relative = LinkCore.resolve(records, "/vault/README.md", "docs/guide.md#التثبيت");
  assert.equal(relative.path, "/vault/docs/guide.md");
  assert.equal(relative.heading.text, "التثبيت");
  const alias = LinkCore.resolve(records, "/vault/README.md", "دليل");
  assert.equal(alias.path, "/vault/docs/guide.md");
  const parent = LinkCore.resolve(records, "/vault/docs/other.md", "../README.md#البداية");
  assert.equal(parent.path, "/vault/README.md");
  assert.equal(parent.heading.text, "البداية");
});

test("extracts outgoing links outside code and returns backlink context", () => {
  const outgoing = LinkCore.outgoing(records[0]);
  assert.deepEqual(outgoing.map((link) => link.target), ["دليل", "docs/guide.md#التثبيت"]);
  const context = LinkCore.context(records, "/vault/docs/guide.md");
  assert.equal(context.backlinks.length, 2);
  assert.equal(context.backlinks[0].rel, "README.md");
  assert.match(context.backlinks[0].context, /دليل/);
});

test("unknown and external links are not resolved as workspace files", () => {
  assert.equal(LinkCore.resolve(records, "/vault/README.md", "https://example.com/x.md"), null);
  assert.equal(LinkCore.resolve(records, "/vault/README.md", "missing"), null);
});
