import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { startServer } from "../src/server.mjs";

const moduleTarget = process.env.MATN_PLAYWRIGHT_PATH
  ? pathToFileURL(process.env.MATN_PLAYWRIGHT_PATH).href
  : "playwright";
const { chromium } = await import(moduleTarget);
const root = await mkdtemp(join(tmpdir(), "matn-playwright-"));
const dataDir = await mkdtemp(join(tmpdir(), "matn-playwright-state-"));
await mkdir(join(root, "docs"));
await writeFile(join(root, "README.md"), "# البداية\nفقرة عربية قابلة للتحديد والتمييز والنسخ.\n\n[الدليل](docs/guide.md#التثبيت) و[مفقود](docs/missing.md)\n\n## قسم ثان\nمقطع ثان لإضافة ملاحظة **واضحة**.\n\n- بند أول\n- بند ثان\n\n| الاسم | القيمة |\n|---|---|\n| اختبار | ناجح |\n\n```js\nconst direction = 'rtl';\n```\n\n```mermaid\ngraph TD; A-->B\n```\n\n### خاتمة\nنهاية المستند.\n");
await writeFile(join(root, "docs", "guide.md"), "# الدليل\n## التثبيت\nخطوات.\n");
await writeFile(join(root, "typography.md"), "---\ntitle: دليل\n---\n\n# مقدمة\n\n## Getting Started\nفقرة عربية.\n\n## Node.js والتشغيل المحلي\nفقرة أخرى.\n\nThis whole paragraph is English prose and nothing else, so it has to read from the left.\n\nانظر [الدليل](./docs/guide.md) للتفاصيل.\n\n```js\nconst مرحبا = \"أهلا\";\n```\n\n$$\\int_0^\\infty e^{-x}\\,dx = 1$$\n\nنص مع حاشية.[^1]\n\n## قسم أخير\nنهاية.\n\n[^1]: نص الحاشية.\n");
await writeFile(join(root, "outline.md"), "# دليل طويل\n\n" + ["الإعدادات","التثبيت","البداية","الخطوط","المعادلات","المخططات","الروابط","البحث","التصدير","الطباعة","الأمان","الأداء"].map((name) => `## ${name}\n\nفقرة عن ${name}.\n`).join("\n"));
await writeFile(join(root, "epub.md"), "# كتاب\n\nفقرة.\n\n---\n\nسطر  \nوسطر ثانٍ.\n\n![صورة](missing.png)\n\n- [ ] مهمة\n"); 
await writeFile(join(root, "change.md"), "# متغيّر\n\n" + Array.from({ length: 12 }, (_, i) => `## قسم ${i + 1}\n\n${"فقرة عربية للاختبار. ".repeat(20)}\n`).join("\n"));
await writeFile(join(root, "SUMMARY.md"), "# Summary\n\n- [البداية](README.md)\n  - [الدليل](docs/guide.md#التثبيت)\n- [خارجي](https://example.com)\n");
const actions = { trash: async () => {}, reveal: async () => {}, openEditor: async () => {} };
const server = await startServer({ port: 0, host: "127.0.0.1", defaultArg: root, dataDir, allowFileActions: true, editor: "/editor", platformActions: actions });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });

async function selectText(page, text) {
  await page.evaluate((wanted) => {
    const walker = document.createTreeWalker(document.querySelector("#doc"), NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return node.nodeValue && node.nodeValue.includes(wanted) && !node.parentElement.closest("button,.anchor,.copybtn")
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      }
    });
    const node = walker.nextNode();
    if (!node) throw new Error(`text not found: ${wanted}`);
    const at = node.nodeValue.indexOf(wanted), range = document.createRange();
    range.setStart(node, at);
    range.setEnd(node, at + wanted.length);
    const selection = getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event("selectionchange", { bubbles: true }));
  }, text);
  await page.waitForSelector("#selectiontools.open", { timeout: 1000 });
}

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: base });
  const page = await context.newPage();
  await page.goto(`${base}/?dir=${encodeURIComponent(root)}&path=${encodeURIComponent(join(root, "README.md"))}`);
  await page.waitForSelector("#toc a");
  await page.waitForSelector("#book-sec .book-chapter");
  const viewportOverflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
    main: document.querySelector("main").scrollWidth - document.querySelector("main").clientWidth,
  }));
  assert.deepEqual(viewportOverflow, { document: 0, body: 0, main: 0 });
  assert.equal(await page.locator("main").evaluate((el) => getComputedStyle(el).overflowX), "hidden");
  assert.equal(await page.locator("aside#side").evaluate((el) => getComputedStyle(el).overflowX), "hidden");
  assert.equal(await page.locator("#fname").getAttribute("dir"), "auto");
  assert.match(await page.locator("#rtime").innerText(), /^\d+ \S+ · \d+ \S+$/);
  assert.equal(await page.locator("#live").evaluate((el) => getComputedStyle(el).position), "static");
  assert.equal(await page.locator("body").evaluate((el) => el.classList.contains("ui-ready")), true);
  await page.locator("#gearbtn").dispatchEvent("pointerdown", { pointerId: 1, clientX: 10, clientY: 10 });
  assert.equal(await page.locator("#gearbtn").evaluate((el) => el.classList.contains("is-pressing")), true);
  await page.locator("#gearbtn").dispatchEvent("pointerup", { pointerId: 1, clientX: 10, clientY: 10 });
  assert.equal(await page.locator("#gearbtn").evaluate((el) => el.classList.contains("is-pressing")), false);
  await page.locator("main").evaluate((el) => { el.scrollTop = 80; el.dispatchEvent(new Event("scroll")); });
  await page.waitForFunction(() => document.querySelector("main").classList.contains("is-scrolled"));
  await page.locator("main").evaluate((el) => { el.scrollTop = 0; el.dispatchEvent(new Event("scroll")); });
  assert.equal(await page.locator("#inspector").isVisible(), true);
  await page.locator("#inspectorbtn").click();
  await page.locator("#inspector").waitFor({ state: "hidden" });
  assert.equal(await page.locator("#inspector").isVisible(), false);
  await page.locator("#inspectorbtn").click();
  await page.waitForFunction(() => document.querySelector("#inspector").getBoundingClientRect().width > 250);
  assert.equal(await page.locator("#inspector").isVisible(), true);
  await page.locator("#sidebtn").click();
  await page.locator("aside#side").waitFor({ state: "hidden" });
  assert.equal(await page.locator("aside#side").isVisible(), false);
  await page.locator("#sidebtn").click();
  await page.waitForFunction(() => document.querySelector("aside#side").getBoundingClientRect().width > 240);
  assert.equal(await page.locator("aside#side").isVisible(), true);
  assert.equal(await page.locator("#book-count").innerText(), "2");
  assert.match(await page.locator("#chapterboundary").innerText(), /1 \/ 2.*البداية/);
  await page.locator("#booknext").click();
  await page.waitForFunction(() => document.title.startsWith("guide.md"));
  await page.waitForFunction(() => document.querySelector("#chapterboundary")?.textContent.includes("2 / 2"));
  assert.match(await page.locator("#chapterboundary").innerText(), /2 \/ 2.*الدليل/);
  assert.match(await page.locator("#chapterboundary").innerText(), /docs\/guide.md#التثبيت-1/);
  await page.locator("#bookprev").click();
  await page.waitForFunction(() => document.title.startsWith("README.md"));
  await page.waitForFunction(() => document.querySelector("#chapterboundary")?.textContent.includes("1 / 2"));
  const sourceLine = await page.locator('#doc h2[data-title="قسم ثان"]').getAttribute("data-source-line");
  await page.locator("#viewbtn").click();
  assert.equal(await page.locator("body").evaluate((el) => el.classList.contains("view-source")), true);
  assert.equal(await page.locator("#sourceview").getAttribute("dir"), null);
  assert.equal(await page.locator("#sourceview").evaluate((el) => getComputedStyle(el).direction), "ltr");
  assert.equal(await page.locator("#sourceview textarea,#sourceview [contenteditable]").count(), 0);
  await page.evaluate(() => {
    const line = document.querySelector("#source-line-1"), range = document.createRange();
    range.selectNodeContents(line);
    const selection = getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await page.keyboard.press(process.platform === "darwin" ? "Meta+C" : "Control+C");
  await page.waitForFunction(async () => (await navigator.clipboard.readText()).includes("# البداية"));
  await page.keyboard.press("/");
  await page.locator("#findinput").fill("const direction");
  assert.match(await page.locator("#sourceview mark.find-cur").innerText(), /const direction/);
  await page.locator("#findclose").click();
  await page.locator("#viewbtn").click();
  assert.equal(await page.locator("body").evaluate((el) => el.classList.contains("view-split")), true);
  await page.locator("#viewbtn").click();
  assert.equal(await page.locator("body").evaluate((el) => !el.classList.contains("view-source") && !el.classList.contains("view-split")), true);
  await page.locator('#doc h2[data-title="قسم ثان"] .source-link').click();
  assert.equal(await page.locator(`#source-line-${sourceLine}`).evaluate((el) => el.classList.contains("source-target")), true);
  await page.locator("#viewbtn").click();
  assert.equal(await page.locator("#inspector").isVisible(), true);
  await page.locator('[data-inspector-tab="info"]').click();
  assert.equal(await page.locator("#inspector").getAttribute("data-tab"), "info");
  await page.waitForSelector("#health-sec .health-row");
  assert.equal(await page.locator("#health-count").innerText(), "1");
  await page.locator("#health .collection-item").click();
  await page.waitForSelector("#findbar.open");
  assert.match(await page.locator("#doc mark.find-cur").innerText(), /مفقود/);
  await page.locator("#findclose").click();
  await page.locator("#health .health-copy").click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), "docs/missing.md");
  await page.locator('[data-inspector-tab="outline"]').click();
  assert.equal(await page.locator("#toc-sec").evaluate((el) => el.style.display), "block");

  await page.locator("#gearbtn").click();
  await page.waitForSelector("#panel.open");
  await page.waitForSelector('.mermaid[data-mermaid-theme="default"]');
  await page.locator('[data-theme-val="dark"]').click();
  await page.waitForSelector('.mermaid[data-mermaid-theme="dark"]');
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  await page.waitForFunction(() => getComputedStyle(document.querySelector("main")).color === "rgb(255, 255, 255)");
  assert.equal(await page.locator("main").evaluate((el) => getComputedStyle(el).color), "rgb(255, 255, 255)");
  await page.locator('[data-theme-val="light"]').click();
  await page.waitForSelector('.mermaid[data-mermaid-theme="default"]');
  await page.waitForFunction(() => getComputedStyle(document.querySelector("main")).color === "rgb(0, 0, 0)");
  assert.equal(await page.locator("main").evaluate((el) => getComputedStyle(el).color), "rgb(0, 0, 0)");
  await page.locator('[data-theme-val="system"]').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem("matn.reading")).theme === "system");
  assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("matn.reading")).theme), "system");
  await page.locator('[data-theme-val="light"]').click();
  assert.match(await page.locator('[data-preset="article"] .preset-copy').innerText(), /للمقالات/);
  assert.match(await page.locator('[data-preset="academic"] .preset-copy').innerText(), /للأوراق/);
  await page.locator('[data-preset="article"]').click();
  assert.equal(await page.locator('[data-preset="article"]').getAttribute("data-active"), "1");
  await page.locator('[data-lang-val="en"]').click();
  assert.equal(await page.locator("html").getAttribute("dir"), "ltr");
  assert.match(await page.locator('[data-preset="article"] .preset-copy').innerText(), /articles and posts/);
  assert.equal(await page.locator("#doc .foldbtn").first().getAttribute("aria-label"), "Collapse section");
  await page.locator('[data-lang-val="ar"]').click();
  assert.equal(await page.locator("html").getAttribute("dir"), "rtl");
  // the panel must open under the toolbar button that owns it, not across the screen
  const gearBox = await page.locator("#gearbtn").boundingBox();
  const panelBox = await page.locator("#panel").boundingBox();
  assert.ok(Math.abs((gearBox.x + gearBox.width / 2) - (panelBox.x + panelBox.width / 2)) < 260,
    `settings panel is ${Math.round(Math.abs((gearBox.x + gearBox.width / 2) - (panelBox.x + panelBox.width / 2)))}px from its button`);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#panel").getAttribute("class"), "panel");

  await page.getByRole("link", { name: "الدليل" }).click();
  await page.waitForFunction(() => document.title.startsWith("guide.md"));
  await page.getByRole("button", { name: "رجوع" }).click();
  await page.waitForFunction(() => document.title.startsWith("README.md"));
  await page.locator("#doc").getByText("فقرة عربية قابلة للتحديد والتمييز والنسخ.", { exact: true }).waitFor();

  const firstParagraph = page.locator("#doc p").first();
  await firstParagraph.scrollIntoViewIfNeeded();
  const dragRect = await firstParagraph.evaluate((el) => {
    const node = el.firstChild, range = document.createRange();
    range.setStart(node, 0);
    range.setEnd(node, Math.min(14, node.nodeValue.length));
    const rect = range.getBoundingClientRect();
    return { left: rect.left, right: rect.right, y: rect.top + rect.height / 2 };
  });
  await page.mouse.move(dragRect.right - 2, dragRect.y);
  await page.mouse.down();
  await page.mouse.move(dragRect.left + 2, dragRect.y, { steps: 8 });
  await page.mouse.up();
  await page.waitForSelector("#selectiontools.open", { timeout: 1000 });
  await page.locator('[data-selection-color="green"]').click();
  await page.waitForSelector("mark.annotation-mark");
  assert.match(await page.locator("mark.annotation-mark").first().innerText(), /فقرة|عربية/);
  // the colour is chosen at highlight time — no second trip through the note dialog
  assert.match(await page.locator("mark.annotation-mark").first().getAttribute("class"), /annotation-green/);
  assert.equal(await page.locator(".toast-undo").isVisible(), true);

  await selectText(page, "والتمييز");
  await page.locator('[data-selection-action="favorite"]').click();
  await page.waitForSelector("#favorites-sec .collection-item");
  assert.equal(await page.locator("#favorites-count").innerText(), "1");
  const mainBox = await page.locator("main").boundingBox(), sideBox = await page.locator("aside#side").boundingBox(), inspectorBox = await page.locator("aside#inspector").boundingBox();
  assert.ok(sideBox.x > mainBox.x, "the Arabic sidebar should be on the right");
  assert.ok(inspectorBox.x < mainBox.x, "the inspector should flank the opposite side of the reading surface");

  await selectText(page, "والنسخ");
  await page.locator('[data-selection-action="copy"]').click();
  let copiedText = "";
  for (let attempt = 0; attempt < 20; attempt++) {
    copiedText = await page.evaluate(() => navigator.clipboard.readText());
    if (copiedText.includes("والنسخ")) break;
    await page.waitForTimeout(50);
  }
  assert.match(copiedText, /والنسخ/);

  await page.evaluate(() => {
    const heading = Array.from(document.querySelectorAll("#doc h2")).find((node) => node.dataset.title === "قسم ثان");
    const region = heading.nextElementSibling;
    const range = document.createRange();
    range.setStartBefore(heading);
    range.setEndAfter(region);
    const selection = getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event("selectionchange", { bubbles: true }));
  });
  await page.waitForSelector("#selectiontools.open", { timeout: 1000 });
  await page.locator('[data-selection-action="copy"]').click();
  await page.waitForFunction(async () => (await navigator.clipboard.read())[0]?.types.includes("text/html"));
  const clipboard = await page.evaluate(async () => {
    const [item] = await navigator.clipboard.read();
    const html = item.types.includes("text/html") ? await (await item.getType("text/html")).text() : "";
    const plain = await (await item.getType("text/plain")).text();
    return { types: item.types, html, plain };
  });
  assert.ok(clipboard.types.includes("text/html"));
  assert.ok(clipboard.types.includes("text/plain"));
  assert.match(clipboard.html, /dir="rtl"/);
  assert.match(clipboard.html, /<strong>واضحة<\/strong>/);
  assert.match(clipboard.html, /<table>/);
  assert.match(clipboard.html, /<pre><code>/);
  assert.doesNotMatch(clipboard.html, /<button|onclick=|<script/i);
  assert.match(clipboard.plain, /قسم ثان/);

  await selectText(page, "مقطع ثان");
  await page.locator('[data-selection-action="note"]').click();
  await page.waitForSelector("#notedialog[open]");
  await page.locator("#notetext").fill("ملاحظة اختبار");
  await page.locator("#notesave").click();
  await page.locator('[data-inspector-tab="notes"]').click();
  await page.waitForSelector("#annotations-sec .collection-item");
  const savedAnnotations = await page.evaluate(() => fetch("/api/state").then((response) => response.json()).then((state) => state.workspace.annotations));
  assert.equal(savedAnnotations.length, 2);
  assert.equal(await page.locator("#annotations-count").innerText(), "2");

  // a highlight used to be permanent: the delete path existed on the server but no
  // control in the reader ever called it, and nothing offered a way back.
  await page.locator("mark.annotation-mark").first().click();
  await page.waitForSelector("#notedialog[open]");
  assert.equal(await page.locator("#notedelete").isVisible(), true);
  await page.locator("#notedelete").click();
  await page.waitForFunction(() => document.querySelectorAll("mark.annotation-mark").length === 1);
  await page.locator(".toast-undo").click();
  await page.waitForFunction(() => document.querySelectorAll("mark.annotation-mark").length === 2);
  const restored = await page.evaluate(() => fetch("/api/state").then((response) => response.json()).then((state) => state.workspace.annotations));
  assert.equal(restored.length, 2);

  const secondFold = page.locator("#doc h2 .foldbtn").first();
  const foldRegionId = await secondFold.getAttribute("aria-controls");
  await secondFold.click();
  assert.equal(await secondFold.getAttribute("aria-expanded"), "false");
  await page.waitForTimeout(260);
  assert.equal(await page.locator(`#${foldRegionId}`).evaluate((el) => Math.round(el.getBoundingClientRect().height)), 0);

  await page.locator("#actionsbtn").click();
  await page.locator('#filemenu [data-file-action="trash"]').click();
  await page.waitForSelector("#trashdialog[open]");
  assert.equal(await page.locator(":focus").getAttribute("id"), "trashcancel");
  await page.locator("#trashcancel").click();
  await page.setViewportSize({ width: 390, height: 844 });
  const interactiveMapMark = page.locator("#documentmap .map-mark").nth(1);
  const mapTargetId = await interactiveMapMark.getAttribute("data-id");
  await page.locator("#maptoggle").click();
  assert.equal(await page.locator("#documentmap").getAttribute("class"), "document-map open");
  await page.locator("#mapcard [data-id]").nth(1).click();
  await page.waitForFunction((id) => decodeURIComponent(location.hash.slice(1)) === id, mapTargetId);
  // the sidebar must collapse to a drawer: it used to stay at its fixed 264px because
  // syncSide() wrote an inline display, which outranks the responsive rule.
  assert.equal(await page.locator("aside#side").isVisible(), false);
  const mobileParagraph = await page.locator("#doc p").first().boundingBox();
  assert.ok(mobileParagraph.width > 280, `reading column collapsed to ${Math.round(mobileParagraph.width)}px on mobile`);
  await page.locator("#sidebtn").click();
  assert.equal(await page.locator("body").evaluate((el) => el.classList.contains("side-open")), true);
  assert.equal(await page.locator("aside#side").isVisible(), true);
  await page.locator("#sidebackdrop").click({ position: { x: 10, y: 100 } });
  assert.equal(await page.locator("body").evaluate((el) => el.classList.contains("side-open")), false);
  await context.close();
  const systemDarkContext = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: "dark" });
  const systemDarkPage = await systemDarkContext.newPage();
  await systemDarkPage.goto(`${base}/?dir=${encodeURIComponent(root)}&path=${encodeURIComponent(join(root, "README.md"))}`);
  await systemDarkPage.waitForSelector("#doc h1");
  assert.equal(await systemDarkPage.locator("html").getAttribute("data-theme"), "dark");
  assert.equal(await systemDarkPage.locator("html").evaluate((el) => getComputedStyle(el).colorScheme), "dark");
  await systemDarkContext.close();

  // The reading surface itself: direction, target sizes, and whether a save from an
  // editor throws away where the reader was.
  const readingContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const reading = await readingContext.newPage();
  await reading.goto(`${base}/?dir=${encodeURIComponent(root)}&path=${encodeURIComponent(join(root, "typography.md"))}`);
  await reading.waitForSelector("#doc .katex-display .katex");
  await reading.waitForSelector("#toc a");

  // display math is centred in the column, not flushed against its edge — a blanket
  // `.katex{text-align:left}` used to override KaTeX's own centring for display mode
  const mathOffsets = await reading.evaluate(() => {
    const inner = document.querySelector(".katex-display .katex .katex-html, .katex-display .katex");
    const box = inner.getBoundingClientRect(), column = document.querySelector("#doc p").getBoundingClientRect();
    return { left: box.left - column.left, right: column.right - box.right };
  });
  assert.ok(Math.abs(mathOffsets.left - mathOffsets.right) < 24,
    `display math sits ${Math.round(mathOffsets.left)}px from one edge and ${Math.round(mathOffsets.right)}px from the other`);

  // frontmatter keys and the card's own label are chrome: they read by their own
  // content, not by whichever direction the document happens to vote for
  assert.equal(await reading.locator("#doc .frontmatter summary").getAttribute("dir"), "auto");
  assert.equal(await reading.locator("#doc .frontmatter dt").first().getAttribute("dir"), "auto");
  assert.equal(await reading.locator("#doc .frontmatter dl").evaluate((el) => el.scrollWidth - el.clientWidth), 0);

  // the footnote section heading is screen-reader-only and localised, so it belongs
  // to assistive tech — not to the visible outline
  assert.equal(await reading.locator("#doc h2.sr-only").innerText(), "الحواشي");
  assert.equal(await reading.locator("#doc h2.sr-only .anchor, #doc h2.sr-only .foldbtn").count(), 0);
  assert.deepEqual(await reading.locator("#toc a").allInnerTexts(), ["مقدمة", "Getting Started", "Node.js والتشغيل المحلي", "قسم أخير"]);

  // an Arabic document stays right-to-left, but a paragraph written entirely in the
  // other script reads in its own direction — otherwise its closing period lands at
  // the start of the line.
  assert.equal(await reading.locator("#doc p", { hasText: "This whole paragraph" }).evaluate((el) => getComputedStyle(el).direction), "ltr");
  assert.equal(await reading.locator("#doc p", { hasText: "انظر" }).evaluate((el) => getComputedStyle(el).direction), "rtl");
  // headings are the exception: they carry no trailing punctuation to strand, and a
  // flipped one drags its fold chevron and its rule to the opposite margin
  assert.equal(await reading.locator("#doc h2", { hasText: "Getting Started" }).evaluate((el) => getComputedStyle(el).direction), "rtl");
  assert.equal(await reading.locator("#doc h2", { hasText: "والتشغيل المحلي" }).evaluate((el) => getComputedStyle(el).direction), "rtl");
  const headingEdges = await reading.evaluate(() => Array.from(document.querySelectorAll("#doc h2")).filter((h) => !h.classList.contains("sr-only")).map((h) => Math.round(h.getBoundingClientRect().right)));
  assert.equal(new Set(headingEdges).size, 1, `headings hang off different margins: ${headingEdges.join(", ")}`);

  // Arabic runs inside code are isolated: without <bdi> the neutral `= "` between two
  // Arabic runs joins them and the assignment renders back to front.
  assert.equal(await reading.locator("#doc pre code bdi").first().innerText(), "مرحبا");
  assert.equal(await reading.locator("#doc pre code").first().innerText().then((t) => t.trim()), 'const مرحبا = "أهلا";');

  // every standalone control clears the 24×24 floor; links inside a sentence are
  // exempt by WCAG 2.5.8 and are excluded here for that reason
  const undersized = await reading.evaluate(() => {
    const out = [];
    document.querySelectorAll("#doc button, .sec button, .toolbar button").forEach((el) => {
      const box = el.getBoundingClientRect();
      if (!box.width || !box.height) return;
      if (box.width < 24 || box.height < 24) out.push(`${el.className} ${Math.round(box.width)}x${Math.round(box.height)}`);
    });
    return out;
  });
  assert.deepEqual(undersized, [], `controls under the 24px target floor: ${undersized.join(", ")}`);

  // a save must not cost the reader their collapsed sections or their place
  await reading.locator("#doc h2 .foldbtn").first().click();
  await reading.evaluate(() => document.querySelector("main").scrollTo(0, 260));
  await reading.waitForTimeout(200);
  const before = await reading.evaluate(() => ({ folds: document.querySelectorAll(".fold-region.collapsed").length, scroll: Math.round(document.querySelector("main").scrollTop) }));
  assert.equal(before.folds, 1);
  await writeFile(join(root, "typography.md"), (await readFile(join(root, "typography.md"), "utf8")) + "\nسطر أضافه المحرر.\n");
  await reading.waitForFunction(() => document.querySelector("#doc").textContent.includes("سطر أضافه المحرر"));
  const after = await reading.evaluate(() => ({ folds: document.querySelectorAll(".fold-region.collapsed").length, scroll: Math.round(document.querySelector("main").scrollTop) }));
  assert.equal(after.folds, before.folds, "a live reload dropped the collapsed section");
  assert.ok(Math.abs(after.scroll - before.scroll) < 24, `a live reload moved the reader ${Math.abs(after.scroll - before.scroll)}px`);

  // The outline is a wall on a long document. Filtering it uses the same Arabic
  // normalisation the library search uses, so an unhamzated query still lands.
  await reading.goto(`${base}/?dir=${encodeURIComponent(root)}&path=${encodeURIComponent(join(root, "outline.md"))}`);
  await reading.waitForSelector("#toc a");
  assert.equal(await reading.locator("#tocfilter").isVisible(), true);
  assert.equal(await reading.locator("#toc-count").innerText(), "13");
  await reading.locator("#tocfilter").fill("الاعدادات");
  await reading.waitForFunction(() => document.querySelector("#toc-count").textContent === "1/13");
  assert.deepEqual(await reading.locator("#toc a:visible").allInnerTexts(), ["الإعدادات"]);
  await reading.locator("#tocfilter").fill("zzz");
  await reading.waitForSelector("#tocempty:visible");
  assert.equal(await reading.locator("#tocempty").innerText(), "لا عنوان مطابق");
  // Escape clears the field rather than closing the inspector out from under it
  await reading.locator("#tocfilter").press("Escape");
  await reading.waitForFunction(() => document.querySelectorAll("#toc a:not([style*='none'])").length === 13);
  assert.equal(await reading.locator("#inspector").isVisible(), true);
  // a short outline is not worth a filter box
  await reading.goto(`${base}/?dir=${encodeURIComponent(root)}&path=${encodeURIComponent(join(root, "typography.md"))}`);
  await reading.waitForSelector("#toc a");
  assert.equal(await reading.locator("#tocfilter").isVisible(), false);

  // The shortcuts all worked already; none of them were written down anywhere.
  await reading.keyboard.press("?");
  await reading.waitForSelector("#shortcutdialog[open]");
  assert.equal(await reading.locator("#shortcutlist dt").count(), 10);
  assert.equal(await reading.locator("#shortcutlist dd").last().innerText(), "هذه القائمة");
  // key pairs read left to right even in the Arabic interface, as macOS does
  assert.equal(await reading.locator("#shortcutlist dt").first().evaluate((el) => getComputedStyle(el).direction), "ltr");
  await reading.locator("#shortcutclose").click();
  await reading.waitForFunction(() => !document.querySelector("#shortcutdialog").open);
  // and a "?" typed into a field is just a question mark
  await reading.locator("#tocfilter").evaluate((el) => { el.style.display = "block"; el.focus(); });
  await reading.keyboard.press("?");
  assert.equal(await reading.locator("#shortcutdialog").evaluate((el) => el.open), false);
  // the keystroke is undiscoverable on its own, so the settings panel opens it too
  await reading.keyboard.press("Escape");
  await reading.locator("#gearbtn").click();
  await reading.waitForSelector("#panel.open");
  await reading.locator("#shortcutbtn").click();
  await reading.waitForSelector("#shortcutdialog[open]");
  assert.equal(await reading.locator("#panel").evaluate((el) => el.classList.contains("open")), false);
  await reading.locator("#shortcutclose").click();

  // EPUB is XHTML. The DOM serialises HTML5, so <hr>, <br>, <img> and the task-list
  // <input> came out unclosed and a conforming reader rejected the file outright.
  await reading.goto(`${base}/?dir=${encodeURIComponent(root)}&path=${encodeURIComponent(join(root, "epub.md"))}`);
  await reading.waitForSelector("#doc h1");
  const chapter = await reading.evaluate(() => {
    const dir = document.querySelector("#doc").getAttribute("dir") || "rtl";
    const body = toXhtmlBody(docHTML().split("<body>")[1].replace("</body></html>", ""));
    return `<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml" dir="${dir}"><head><title>t</title></head><body>${body}</body></html>`;
  });
  assert.equal(await reading.evaluate((xml) => {
    const parsed = new DOMParser().parseFromString(xml, "application/xhtml+xml");
    const error = parsed.querySelector("parsererror");
    return error ? error.textContent.replace(/\s+/g, " ").slice(0, 160) : "";
  }, chapter), "", "the EPUB chapter is not well-formed XHTML");
  assert.match(chapter, /<hr\s*\/>/);
  assert.match(chapter, /<br\s*\/>/);
  assert.match(chapter, /<img[^>]*\/>/);

  // Markdown arrives on the clipboard as often as it arrives as a file.
  await readingContext.grantPermissions(["clipboard-read", "clipboard-write"], { origin: base });
  await reading.goto(`${base}/?dir=${encodeURIComponent(root)}&path=${encodeURIComponent(join(root, "outline.md"))}`);
  await reading.waitForSelector("#doc h1");
  await reading.evaluate(() => navigator.clipboard.writeText("# مستند ملصوق\n\nمن الحافظة.\n"));
  await reading.keyboard.press(process.platform === "darwin" ? "Meta+V" : "Control+V");
  await reading.waitForFunction(() => document.querySelector("#doc h1")?.textContent.includes("مستند ملصوق"));
  assert.equal(await reading.locator("#fname").innerText(), "نص ملصوق");
  // a stray Cmd+V while reading must not cost you the document you had open
  await reading.locator(".toast-undo").click();
  await reading.waitForFunction(() => document.querySelector("#doc h1")?.textContent.includes("دليل طويل"));
  assert.equal(await reading.locator("#fname").innerText(), "outline.md");
  // and a paste aimed at a field is just a paste
  await reading.locator("#tocfilter").click();
  await reading.evaluate(() => navigator.clipboard.writeText("الخطوط"));
  await reading.keyboard.press(process.platform === "darwin" ? "Meta+V" : "Control+V");
  await reading.waitForFunction(() => document.querySelector("#tocfilter").value === "الخطوط");
  assert.match(await reading.locator("#doc h1").innerText(), /دليل طويل/);
  await reading.locator("#tocfilter").fill("");

  // A reload holds your place, so a change further down can land unseen. Point at
  // it — but do not move the reader there without being asked.
  await reading.goto(`${base}/?dir=${encodeURIComponent(root)}&path=${encodeURIComponent(join(root, "change.md"))}`);
  await reading.waitForSelector("#doc h2");
  await reading.evaluate(() => document.querySelector("main").scrollTo(0, 200));
  await reading.waitForTimeout(200);
  const scrollBefore = await reading.evaluate(() => Math.round(document.querySelector("main").scrollTop));
  await writeFile(join(root, "change.md"), (await readFile(join(root, "change.md"), "utf8")).replace("## قسم 9", "## قسم 9\n\nسطر أضافه الوكيل.\n"));
  await reading.waitForSelector(".toast-undo");
  assert.equal(await reading.locator("#toast span").first().innerText(), "تغيّر الملف");
  assert.equal(await reading.locator(".toast-undo").innerText(), "اذهب إلى التغيير");
  assert.ok(Math.abs(await reading.evaluate(() => Math.round(document.querySelector("main").scrollTop)) - scrollBefore) < 24,
    "a live reload moved the reader without being asked");
  await reading.locator(".toast-undo").click();
  await reading.waitForFunction(() => document.querySelector("main").scrollTop > 800);
  assert.match(await reading.locator("#doc .source-target").innerText(), /قسم 9/);
  await readingContext.close();
  console.log("playwright: selection actions, reading modes, folding, document map, RTL sidebar, menus, mobile drawer, reading-surface direction, target sizes, live-reload state, outline filter, shortcut sheet, EPUB well-formedness, clipboard reading, and change-jump passed");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  await rm(root, { recursive: true, force: true });
  await rm(dataDir, { recursive: true, force: true });
}
