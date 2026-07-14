import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import core from "../src/render-core.cjs";

test("esc escapes HTML-sensitive characters and tolerates nullish input", () => {
  assert.equal(core.esc("<b>&\"'"), "&lt;b&gt;&amp;&quot;&#39;");
  assert.equal(core.esc(null), "");
  assert.equal(core.esc(undefined), "");
});

test("safeHref blocks executable and unknown schemes", () => {
  for (const href of [
    "javascript:alert(1)",
    "vbscript:msgbox(1)",
    "data:text/html,x",
    "foo:bar",
    "java\tscript:alert(1)",
    "java\nscript:alert(1)"
  ]) assert.equal(core.safeHref(href, "link"), "", href);
  assert.equal(core.safeHref("data:image/svg+xml,x", "img"), "");
});

test("safeHref allows expected links and raster data images", () => {
  for (const href of [
    "https://x.example",
    "http://x",
    "mailto:a@b.c",
    "tel:123",
    "#anchor",
    "/abs",
    "./rel",
    "../up",
    "page.md"
  ]) assert.equal(core.safeHref(href, "link"), href, href);
  assert.equal(core.safeHref("data:image/png;base64,AAAA", "img"), "data:image/png;base64,AAAA");
  assert.equal(core.safeHref("data:image/svg+xml;base64,AAAA", "img"), "");
});

test("safeRenderer escapes raw HTML and unsafe link attributes with the vendored marked", () => {
  const exports = {};
  runInNewContext(readFileSync(new URL("../vendor/marked.min.js", import.meta.url), "utf8"), {
    exports,
    module: { exports }
  });
  const renderer = core.safeRenderer(exports);
  const html = exports.parse('<img src=x onerror="bad">\n\n[go](javascript:alert(1))', { renderer });
  assert.match(html, /&lt;img src=x onerror=&quot;bad&quot;&gt;/);
  assert.doesNotMatch(html, /href="javascript:/);

  const image = renderer.image("https://example.test/x.png", 'title" bad', 'alt" bad');
  assert.match(image, /title="title&quot; bad"/);
  assert.match(image, /alt="alt&quot; bad"/);
});

test("render core loads before the inline browser application", () => {
  const html = readFileSync(new URL("../src/index.html", import.meta.url), "utf8");
  const coreTag = html.indexOf('<script src="/render-core.js"></script>');
  const appScript = html.indexOf('<script>\n"use strict";');
  assert.ok(coreTag >= 0 && appScript > coreTag);
});

test("math extraction characterizes inline, block, currency, and escaping behavior", () => {
  const inline = core.extractMath("a $x$ b");
  assert.equal(inline.store.length, 1);
  assert.deepEqual(inline.store[0], { d: false, t: "x" });

  const block = core.extractMath("$$y^2$$");
  assert.deepEqual(block.store[0], { d: true, t: "y^2" });
  assert.equal(core.extractMath("costs $5$").store.length, 0);
  assert.equal(core.extractMath("$\\alpha$").store[0].t, "\\alpha");

  const roundTrip = core.extractMath("$x$");
  const html = core.restoreMath(roundTrip.src, roundTrip.store);
  assert.match(html, /class="katex-inline"/);
  assert.match(html, /data-tex="x"/);
  assert.match(core.restoreMath("0", [{ d: false, t: 'x" onmouseover="bad' }]), /&quot;/);
  assert.doesNotMatch(core.restoreMath("0", [{ d: false, t: 'x" onmouseover="bad' }]), /data-tex="x" onmouseover=/);
});

test("voteDir keeps Arabic and mixed Arabic prose RTL", () => {
  assert.equal(core.voteDir(["مرحبا بالعالم"]), "rtl");
  assert.equal(core.voteDir(["Context لماذا نبني هذا"]), "rtl");
  assert.equal(core.voteDir(["hello world this is english"]), "ltr");
  assert.equal(core.voteDir([]), "rtl");
  assert.equal(core.voteDir([""]), "rtl");
});

test("parseFrontmatter extracts simple pairs and preserves ordinary documents", () => {
  assert.deepEqual(core.parseFrontmatter("---\ntitle: X\nauthor: Y\n---\nbody text"), {
    body: "body text",
    pairs: [["title", "X"], ["author", "Y"]]
  });
  assert.deepEqual(core.parseFrontmatter("# just a doc"), {
    body: "# just a doc",
    pairs: []
  });
  assert.equal(core.parseFrontmatter("\n---\ntitle: X\n---\nb").pairs.length, 1);
});

test("preprocess preserves fenced and inline code verbatim", () => {
  const html = core.preprocess('```html\n<div dir="rtl">\nx\n</div>\n```');
  assert.match(html.src, /<div dir="rtl">/);
  assert.equal(html.store.length, 0);

  const shell = core.preprocess("```bash\necho $$ total=$$sum\n```");
  assert.match(shell.src, /echo \$\$ total=\$\$sum/);
  assert.equal(shell.store.length, 0);

  const inline = core.preprocess("literal `$x$` example");
  assert.match(inline.src, /`\$x\$`/);
  assert.equal(inline.store.length, 0);

  const fourTicks = core.preprocess('````html\n<div dir="rtl">\n$x$\n</div>\n````');
  assert.match(fourTicks.src, /<div dir="rtl">/);
  assert.equal(fourTicks.store.length, 0);

  const unclosed = core.preprocess("```bash\necho $$\ntotal=$x$");
  assert.equal(unclosed.store.length, 0);
  assert.match(unclosed.src, /total=\$x\$/);

  const doubleTicks = core.preprocess("literal ``$x$ and `nested` `` example");
  assert.equal(doubleTicks.store.length, 0);
  assert.match(doubleTicks.src, /``\$x\$ and `nested` ``/);

  const indented = core.preprocess('    <div dir="rtl"> $x$ </div>\n');
  assert.equal(indented.store.length, 0);
  assert.match(indented.src, /<div dir="rtl"> \$x\$ <\/div>/);
});

test("preprocess keeps prices while extracting real prose math", () => {
  const prices = core.preprocess("costs $5 and $10 today");
  assert.equal(prices.store.length, 0);
  assert.match(prices.src, /\$5 and \$10/);

  const math = core.preprocess("real $x$ and $$y^2$$ math");
  assert.deepEqual(math.store, [{ d: true, t: "y^2" }, { d: false, t: "x" }]);
});

test("preprocess strips standalone GitHub layout wrappers only from prose", () => {
  const result = core.preprocess('<div dir="rtl">\n# عنوان\n</div>');
  assert.doesNotMatch(result.src, /<\/?div/);
  assert.match(result.src, /# عنوان/);
});
