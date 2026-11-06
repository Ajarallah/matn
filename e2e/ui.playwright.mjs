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
await writeFile(join(root, "vault.md"), "# خزنة #مشروع\n\nنص ==مميَّز== هنا.\n\n%%سر لا يظهر%%\n\n> [!faq]- سؤال مطوي\n> جواب.\n\n![[guide#التثبيت]]\n\n![[pixel.png]]\n");
await writeFile(join(root, "pixel.png"), Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000" + "1f15c4890000000d49444154789c6360000002000100e221bc330000000049454e44ae426082", "hex"));
await writeFile(join(root, "epub.md"), "# كتاب\n\nفقرة.\n\n---\n\nسطر  \nوسطر ثانٍ.\n\n![صورة](missing.png)\n\n- [ ] مهمة\n\n## الفصل الأول\n\nنص.\n\n## الفصل الثاني & ما بعده\n\nنص.\n"); 
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
  // the details panel starts closed; these checks read the outline inside it
  await context.addInitScript(() => { try { if (!localStorage.getItem("matn.inspector")) localStorage.setItem("matn.inspector", "1"); } catch {} });
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
  assert.match(await page.locator("#rtime").innerText(), /^[\d,]+ \S+ · \S+/);
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
  await page.waitForFunction(() => getComputedStyle(document.querySelector("main")).color === "rgb(242, 242, 244)");
  assert.equal(await page.locator("main").evaluate((el) => getComputedStyle(el).color), "rgb(242, 242, 244)");
  await page.locator('[data-theme-val="light"]').click();
  await page.waitForSelector('.mermaid[data-mermaid-theme="default"]');
  await page.waitForFunction(() => getComputedStyle(document.querySelector("main")).color === "rgb(29, 29, 31)");
  assert.equal(await page.locator("main").evaluate((el) => getComputedStyle(el).color), "rgb(29, 29, 31)");
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
  // the details panel starts closed; these checks read the outline inside it
  await readingContext.addInitScript(() => { try { if (!localStorage.getItem("matn.inspector")) localStorage.setItem("matn.inspector", "1"); } catch {} });
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
  assert.ok(await reading.locator("#doc .frontmatter dl").evaluate((el) => el.scrollWidth - el.clientWidth) <= 0, "frontmatter values do not overflow the card");

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
  assert.equal(await reading.locator("#shortcutlist dt").count(), 11);
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
  const epub = await reading.evaluate(() => epubFiles());
  const chapter = epub["OEBPS/doc.xhtml"];
  for (const part of ["OEBPS/doc.xhtml", "OEBPS/nav.xhtml", "OEBPS/content.opf", "META-INF/container.xml"]) {
    assert.equal(await reading.evaluate(([xml, type]) => {
      const parsed = new DOMParser().parseFromString(xml, type);
      const error = parsed.querySelector("parsererror");
      return error ? error.textContent.replace(/\s+/g, " ").slice(0, 160) : "";
    }, [epub[part], part.endsWith(".xhtml") ? "application/xhtml+xml" : "application/xml"]), "", `${part} is not well-formed`);
  }
  // the book's contents list the document's headings, and its stylesheet is declared and linked
  const headingIds = await reading.evaluate(() => [...document.querySelectorAll("#doc h1[id],#doc h2[id]")].map((h) => h.id));
  for (const id of headingIds) assert.ok(epub["OEBPS/nav.xhtml"].includes(`doc.xhtml#${id}`) || epub["OEBPS/nav.xhtml"].includes(`doc.xhtml#${id.replace(/&/g, "&amp;")}`), `contents miss #${id}`);
  assert.match(epub["OEBPS/content.opf"], /href="style.css" media-type="text\/css"/);
  assert.match(chapter, /<link rel="stylesheet"[^>]*href="style.css"/);
  // epubcheck: no direction in EPUB CSS (code takes dir="ltr"), and a real UUID
  assert.doesNotMatch(epub["OEBPS/style.css"], /direction|unicode-bidi/);
  assert.match(epub["OEBPS/content.opf"], /urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}</);
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

  // Opening one file instead of a folder is the first example in the README, and a
  // highlight made that way used to save on the server and never appear: with no
  // folder listing the client had no relative path, so it filtered its own
  // annotations against "" and matched none of them.
  const singleRoot = await mkdtemp(join(tmpdir(), "matn-single-"));
  const singleFile = join(singleRoot, "README.md");
  await writeFile(singleFile, "# عنوان\n\nفقرة عربية طويلة نسبيا قابلة للتحديد والتمييز داخل القارئ.\n");
  const singleDataDir = await mkdtemp(join(tmpdir(), "matn-single-state-"));
  const singleServer = await startServer({ port: 0, host: "127.0.0.1", defaultArg: singleFile, dataDir: singleDataDir });
  const singleBase = `http://127.0.0.1:${singleServer.address().port}`;
  try {
    const single = await readingContext.newPage();
    await single.goto(`${singleBase}/?path=${encodeURIComponent(singleFile)}`);
    await single.waitForSelector("#doc p");
    assert.equal(await single.evaluate(() => relForFile(cur)), "README.md", "the reader could not name the file it had open");
    const box = await single.evaluate(() => {
      const node = [...document.querySelector("#doc p").childNodes].find((n) => n.nodeType === 3 && n.nodeValue.trim().length > 20);
      const range = document.createRange();
      range.setStart(node, 0);
      range.setEnd(node, 18);
      const rect = range.getBoundingClientRect();
      return { left: rect.left, right: rect.right, y: rect.top + rect.height / 2 };
    });
    await single.mouse.move(box.right - 2, box.y);
    await single.mouse.down();
    await single.mouse.move(box.left + 2, box.y, { steps: 8 });
    await single.mouse.up();
    await single.waitForSelector("#selectiontools.open");
    await single.locator('[data-selection-color="yellow"]').click();
    await single.waitForSelector("mark.annotation-mark");
    // and it has to still be there after a reload, not just after the click that made it
    await single.reload();
    await single.waitForSelector("#doc p");
    await single.waitForFunction(() => document.querySelectorAll("mark.annotation-mark").length === 1);
    await single.close();
  } finally {
    await new Promise((resolve) => singleServer.close(resolve));
    await rm(singleRoot, { recursive: true, force: true });
    await rm(singleDataDir, { recursive: true, force: true });
  }
  // An Obsidian note reads as Obsidian shows it: embeds filled in, comments hidden, callouts folded.
  await reading.goto(`${base}/?dir=${encodeURIComponent(root)}&path=${encodeURIComponent(join(root, "vault.md"))}`);
  await reading.waitForSelector('#doc .md-embed[data-state="ready"]');
  assert.match(await reading.locator("#doc .md-embed .md-embed-body").innerText(), /خطوات/);
  await reading.waitForFunction(() => document.querySelector("#doc img.md-embed-img")?.naturalWidth === 1);
  assert.equal(await reading.locator("#doc mark.md-mark").innerText(), "مميَّز");
  assert.equal(await reading.locator("#doc a.md-tag").innerText(), "#مشروع");
  assert.doesNotMatch(await reading.locator("#doc").innerText(), /سر لا يظهر|%%/);
  assert.equal(await reading.locator("#doc .callout-folded").count(), 1);
  await reading.locator("#doc button.callout-head").click();
  assert.equal(await reading.locator("#doc .callout-folded").count(), 0);

  // Leave a file, let an agent edit it, come back: the edit is marked and nothing jumps.
  await reading.locator("#files a", { hasText: "outline.md" }).first().click();
  await reading.waitForFunction(() => document.querySelector("#doc h1")?.textContent.includes("دليل طويل"));
  await writeFile(join(root, "vault.md"), (await readFile(join(root, "vault.md"), "utf8")).replace("نص ==مميَّز== هنا.", "نص ==مميَّز== هنا وفيه زيادة.") + "\nفقرة جديدة من الوكيل.\n");
  await reading.locator("#files a", { hasText: "vault.md" }).first().click();
  await reading.waitForSelector("#changesbar");
  assert.equal(await reading.locator("#doc .diff-changed").count(), 1);
  // hovering an edited block shows the edit word by word
  await reading.locator("#doc .diff-changed").first().hover();
  assert.match(await reading.locator("#doc .diff-changed .diff-words ins").first().innerText(), /وفيه/);
  assert.equal(await reading.locator("#doc .diff-added").count(), 1);
  await reading.locator("#changesbar .changes-read").click();
  assert.equal(await reading.locator("#changesbar").count(), 0);
  assert.equal(await reading.locator("#doc .diff-added, #doc .diff-changed").count(), 0);

  // Data the reader made survives a theme switch, stays off exports, and the changes bar
  // never outlives its file.
  await reading.goto(`${base}/?path=${encodeURIComponent(join(root, "vault.md"))}`);
  await reading.waitForSelector("#doc h1");
  await selectText(reading, "هنا وفيه");
  await reading.locator('#selectiontools [data-selection-color="green"]').click();
  await reading.waitForSelector("#doc mark.annotation-mark");
  const marksBefore = await reading.locator("#doc mark.annotation-mark").count();
  await reading.locator("#gearbtn").click();
  await reading.locator('#themes [data-theme-val="dark"]').click();
  await reading.waitForTimeout(400);
  assert.equal(await reading.locator("#doc mark.annotation-mark").count(), marksBefore, "a theme switch keeps highlights");
  await reading.keyboard.press("Escape");
  const exported = await reading.evaluate(() => exportableDoc());
  assert.doesNotMatch(exported, /annotation-mark|foldbtn|source-link/, "exports carry no notes or controls");
  await reading.locator("#files a", { hasText: "outline.md" }).first().click();
  await reading.waitForFunction(() => document.querySelector("#doc h1")?.textContent.includes("دليل طويل"));
  await writeFile(join(root, "vault.md"), (await readFile(join(root, "vault.md"), "utf8")) + "\nسطر أخير.\n");
  await reading.locator("#files a", { hasText: "vault.md" }).first().click();
  await reading.waitForSelector("#changesbar");
  await writeFile(join(root, "fresh.md"), "# جديد\n\nملف لم يُفتح قبل.\n");
  await reading.goto(`${base}/?path=${encodeURIComponent(join(root, "fresh.md"))}`);
  await reading.waitForFunction(() => document.querySelector("#doc h1")?.textContent.includes("جديد"));
  assert.equal(await reading.locator("#changesbar").count(), 0, "the changes bar does not follow you to another file");

  // A share link carries the document in its #fragment and opens it intact.
  const shared = await reading.evaluate(async () => { const link = await shareLinkFor("مشاركة.md", "# مشاركة\n\nنص عربي مع English و`code`.\n"); history.replaceState(null, "", location.pathname + link.slice(link.indexOf("#"))); openSharedFromHash(); return link; });
  assert.match(shared, /^https:\/\/ajarallah\.github\.io\/matn\/#s=[A-Za-z0-9_-]+&n=/);
  await reading.waitForFunction(() => document.querySelector("#doc h1")?.textContent.startsWith("مشاركة"));
  assert.equal(await reading.locator("#fname").innerText(), "مشاركة.md");

  // Find inside the document folds Arabic the way search does: no diacritics needed,
  // taa marbuta and Arabic-Indic digits match, and the hit covers the original letters.
  await writeFile(join(root, "arabic-find.md"), "# بحث\n\nهذه خُطَّةٌ للفصل ١٢ من الكتاب.\n");
  await reading.goto(`${base}/?path=${encodeURIComponent(join(root, "arabic-find.md"))}`);
  await reading.waitForFunction(() => document.querySelector("#doc h1")?.textContent.includes("بحث"));
  await reading.keyboard.press("/");
  await reading.locator("#findinput").fill("خطه");
  assert.equal(await reading.locator("#doc mark.find-cur").innerText(), "خُطَّةٌ");
  await reading.locator("#findinput").fill("للفصل 12");
  assert.equal(await reading.locator("#doc mark.find-cur").innerText(), "للفصل ١٢");
  await reading.keyboard.press("Escape");

  // j / k step through blocks with a reading focus; Escape lets go.
  await reading.goto(`${base}/?path=${encodeURIComponent(join(root, "typography.md"))}`);
  await reading.waitForSelector("#doc h1");
  await reading.evaluate(() => { document.getElementById("scroller").scrollTop = 0; });
  await reading.keyboard.press("j");
  const firstStep = await reading.locator("#doc [data-reading]").innerText();
  await reading.keyboard.press("j");
  assert.notEqual(await reading.locator("#doc [data-reading]").innerText(), firstStep);
  await reading.keyboard.press("k");
  assert.equal(await reading.locator("#doc [data-reading]").innerText(), firstStep);
  await reading.keyboard.press("Escape");
  assert.equal(await reading.locator("#doc [data-reading]").count(), 0);

  // Front matter states the direction; it beats counting letters.
  await writeFile(join(root, "stated-dir.md"), "---\nlang: en\n---\n\n# عنوان عربي\n\nنص عربي قصير.\n");
  await reading.goto(`${base}/?path=${encodeURIComponent(join(root, "stated-dir.md"))}`);
  await reading.waitForFunction(() => document.querySelector("#doc h1")?.textContent.includes("عنوان"));
  assert.equal(await reading.locator("#doc").getAttribute("dir"), "ltr");

  // A file written just now is at the top of "recently changed".
  await writeFile(join(root, "just-written.md"), "# كتبه الوكيل الآن\n");
  await reading.goto(`${base}/?dir=${encodeURIComponent(root)}&path=${encodeURIComponent(join(root, "vault.md"))}`);
  await reading.waitForSelector("#recent a");
  assert.equal(await reading.locator("#recent a .recent-name").first().innerText(), "just-written.md");

  // Plan gate: comment with a suggestion, request changes, then see the revision against the notes.
  const planFile = join(root, "gate-plan.md");
  await writeFile(planFile, "# خطة\n\nننقل كل المناطق دفعة واحدة.\n\nنراقب الأخطاء ساعة.\n");
  const gateId = "d".repeat(32), gateUrl = (id) => `${base}/?path=${encodeURIComponent(planFile)}&review=${id}&gate=1`;
  await reading.goto(gateUrl(gateId));
  await reading.waitForSelector("#reviewapprove:not([hidden])");
  assert.equal(await reading.locator("#reviewsend").isDisabled(), true, "request changes needs a note");
  // the review bar can show before the new file renders; wait for its text
  await reading.waitForFunction(() => document.querySelector("#doc")?.textContent.includes("دفعة واحدة"));
  await selectText(reading, "دفعة واحدة");
  await reading.locator('#selectiontools [data-selection-action="note"]').click();
  assert.equal(await reading.locator("#notesuggestbox").isHidden(), false);
  await reading.fill("#notetext", "خطر كبير");
  await reading.fill("#notesuggest", "منطقة واحدة أولًا");
  await reading.locator("#notesave").click();
  const gateWait = fetch(`${base}/api/review-wait?id=${gateId}`).then((r) => r.json());
  await reading.locator("#reviewsend").click();
  const gateResult = await gateWait;
  assert.equal(gateResult.decision, "changes");
  assert.match(gateResult.markdown, /خطر كبير[\s\S]*Suggested replacement:\n\n> منطقة واحدة أولًا/);
  await writeFile(planFile, "# خطة\n\nننقل منطقة واحدة أولًا ثم البقية.\n\nنراقب الأخطاء ساعة.\n");
  await reading.goto(gateUrl("e".repeat(32)));
  await reading.waitForSelector("#changesbar");
  assert.match(await reading.locator("#changesbar .changes-label").innerText(), /ملاحظاتك السابقة: تغيّر نص 1 من 1/);
  assert.equal(await reading.locator("#reviewsend").isDisabled(), true, "notes already sent are not sent again");
  const approveWait = fetch(`${base}/api/review-wait?id=${"e".repeat(32)}`).then((r) => r.json());
  await reading.locator("#reviewapprove").click();
  assert.match(await reading.locator("#reviewapprove").innerText(), /للتأكيد/, "approving asks for a second press");
  await reading.locator("#reviewapprove").click();
  assert.equal((await approveWait).decision, "approve");

  // `matn <file>` on a running reader shows the file in the open page.
  await reading.goto(`${base}/?path=${encodeURIComponent(planFile)}`);
  await reading.waitForFunction(() => document.querySelector("#doc h1")?.textContent.includes("خطة"));
  const followed = await fetch(`${base}/api/follow`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path: join(root, "vault.md") }) }).then((r) => r.json());
  assert.ok(followed.delivered >= 1);
  await reading.waitForFunction(() => document.querySelector("#doc h1")?.textContent.includes("خزنة"));

  // The start screen names what it opens, lists the folder's newest files (the only file
  // list in view on a phone), and greys the buttons that need a document.
  const startContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const start = await startContext.newPage();
  await start.goto(`${base}/`);
  await start.waitForSelector("#doc.start .start-list .start-item");
  assert.equal(await start.locator("#printbtn").isDisabled(), true, "print needs a document");
  assert.match(await start.locator(".start-actions button:not([hidden])").first().innerText(), /\.md/);
  await start.locator(".start-list .start-item").first().click();
  await start.waitForSelector("#doc:not(.start) h1");
  assert.equal(await start.locator("#printbtn").isDisabled(), false);
  // ⌘K: files whose name matches come first; files that only mention the words follow under
  // their own heading, with a snippet free of Markdown syntax.
  await start.evaluate(() => openQuick("files"));
  await start.locator("#quickinput").fill("الدليل");
  await start.waitForSelector("#quickresults .quick-group");
  const quick = await start.evaluate(() => [...document.querySelectorAll("#quickresults > *")].map((el) => el.className.split(" ")[0] + ":" + (el.querySelector(".quick-title")?.textContent || el.textContent)));
  assert.match(quick[0], /^quick-item:الدليل/);
  const group = quick.findIndex((line) => line.startsWith("quick-group"));
  assert.ok(group > 0 && quick[group + 1]?.startsWith("quick-item:"), quick.join(" | "));
  assert.doesNotMatch(await start.locator("#quickresults .quick-snippet").first().innerText(), /\]\(|^#/);
  await start.keyboard.press("Escape");
  // a file saved by an older Arabic Windows tool (Windows-1256) opens as Arabic, not garbage
  await start.setInputFiles("#fileinput", { name: "legacy.md", mimeType: "text/markdown", buffer: Buffer.from([0x23, 0x20, 0xc7, 0xe1, 0xda, 0xd1, 0xc8, 0xed, 0xc9]) });
  await start.waitForFunction(() => document.querySelector("#doc h1")?.textContent.startsWith("العربية"));
  await startContext.close();

  // On touch the system's own selection menu sits above the selection, so Matn's goes below.
  const touchContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const touch = await touchContext.newPage();
  await touch.goto(`${base}/?path=${encodeURIComponent(join(root, "README.md"))}`);
  await touch.waitForSelector("#doc p");
  const selected = await touch.evaluate(() => { const w = document.createTreeWalker(document.querySelector("#doc"), NodeFilter.SHOW_TEXT, { acceptNode: (n) => n.textContent.trim().length > 10 && n.parentElement.getBoundingClientRect().top > 200 ? 1 : 3 }), t = w.nextNode(), r = document.createRange(); r.setStart(t, 0); r.setEnd(t, 8); getSelection().removeAllRanges(); getSelection().addRange(r); return r.getBoundingClientRect().bottom; });
  await touch.waitForSelector("#selectiontools.open");
  assert.ok(await touch.locator("#selectiontools").evaluate((el) => el.getBoundingClientRect().top) > selected, "touch toolbar sits below the selection");
  await touchContext.close();

  // Notes on every file go to the agent in one hand-off, a section per file
  await reading.evaluate(() => doExport("agentall"));
  await reading.waitForFunction(() => document.querySelector(".toast.show")?.textContent.includes("الوكيل"));
  const handoff = await reading.evaluate(() => navigator.clipboard.readText());
  assert.match(handoff, /^# Review: \d+ files?\n\n\d+ notes?\./);
  assert.match(handoff, /\n## [^\n]+\.md\n/);

  // The English interface carries no Arabic chrome: labels, tooltips, placeholders and
  // text written before the switch (reading time, relative times) all follow the language.
  await reading.locator("#gearbtn").click();
  await reading.locator('[data-lang-val="en"]').click();
  // some text (link health) is fetched again after the switch, so give it a moment to settle
  const scanArabic = () => reading.evaluate(() => {
    const out = [], ar = /[\u0600-\u06FF]/;
    document.querySelectorAll("body *").forEach((el) => {
      if (el.closest("#doc,#files,#recent,#toc,#backlinks,#annotations,#book,#notequote,.toast,.collection-body,script,.margin-notes,[data-lang-val],.sidebar-head strong,#fname") || el.matches("option[value=thmanyah]")) return;
      for (const a of ["title", "aria-label", "placeholder"]) { const v = el.getAttribute(a); if (v && ar.test(v)) out.push(`${el.id || el.tagName}@${a}: ${v}`); }
      for (const n of el.childNodes) if (n.nodeType === 3 && ar.test(n.textContent)) out.push(`${el.id || el.tagName}.${el.className}<${el.parentElement?.id || el.parentElement?.className}: ${n.textContent.trim()}`);
    });
    return out;
  });
  let arabicLeft = await scanArabic();
  for (let tries = 0; arabicLeft.length && tries < 25; tries++) { await reading.waitForTimeout(200); arabicLeft = await scanArabic(); }
  assert.deepEqual(arabicLeft, [], "Arabic text left in the English interface");
  await reading.locator('[data-lang-val="ar"]').click();
  await reading.keyboard.press("Escape");

  await readingContext.close();
  console.log("playwright: all-files hand-off, legacy Arabic encodings, touch selection toolbar, start screen, grouped quick open, English interface free of Arabic chrome, plan gate with suggestions and revision status, follow, Obsidian embeds and syntax, changes since last read, selection actions, reading modes, folding, document map, RTL sidebar, menus, mobile drawer, reading-surface direction, target sizes, live-reload state, outline filter, shortcut sheet, EPUB well-formedness, clipboard reading, change-jump, and single-file annotations passed");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  await rm(root, { recursive: true, force: true });
  await rm(dataDir, { recursive: true, force: true });
}
