import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
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
  await page.waitForFunction(async () => (await navigator.clipboard.readText()).includes("والنسخ"));
  assert.match(await page.evaluate(() => navigator.clipboard.readText()), /والنسخ/);

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
  console.log("playwright: selection actions, reading modes, folding, document map, RTL sidebar, menus, and mobile drawer passed");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  await rm(root, { recursive: true, force: true });
  await rm(dataDir, { recursive: true, force: true });
}
