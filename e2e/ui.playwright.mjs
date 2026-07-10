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
await writeFile(join(root, "README.md"), "# البداية\nفقرة عربية قابلة للتحديد والتمييز والنسخ.\n\n[الدليل](docs/guide.md#التثبيت) و[مفقود](docs/missing.md)\n\n## قسم ثان\nمقطع ثان لإضافة ملاحظة **واضحة**.\n\n- بند أول\n- بند ثان\n\n| الاسم | القيمة |\n|---|---|\n| اختبار | ناجح |\n\n```js\nconst direction = 'rtl';\n```\n\n### خاتمة\nنهاية المستند.\n");
await writeFile(join(root, "docs", "guide.md"), "# الدليل\n## التثبيت\nخطوات.\n");
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
  await page.waitForSelector("#documentmap .map-mark");
  await page.waitForSelector("#health-sec .health-row");
  assert.equal(await page.locator("#health-count").innerText(), "1");
  await page.locator("#health .collection-item").click();
  await page.waitForSelector("#findbar.open");
  assert.match(await page.locator("#doc mark.find-cur").innerText(), /مفقود/);
  await page.locator("#findclose").click();
  await page.locator("#health .health-copy").click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), "docs/missing.md");
  assert.equal(await page.locator("#toc-sec").evaluate((el) => el.style.display), "none");

  await page.locator("#gearbtn").click();
  await page.waitForSelector("#panel.open");
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
  await page.locator("#doc").click({ position: { x: 20, y: 20 } });
  assert.equal(await page.locator("#panel").getAttribute("class"), "panel");

  await page.getByRole("link", { name: "الدليل" }).click();
  await page.waitForFunction(() => document.title.startsWith("guide.md"));
  await page.getByRole("button", { name: "رجوع" }).click();
  await page.waitForFunction(() => document.title.startsWith("README.md"));
  await page.getByText("فقرة عربية قابلة للتحديد والتمييز والنسخ.", { exact: true }).waitFor();

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
  await page.locator('[data-selection-action="highlight"]').click();
  await page.waitForSelector("mark.annotation-mark");
  assert.match(await page.locator("mark.annotation-mark").first().innerText(), /فقرة|عربية/);

  await selectText(page, "والتمييز");
  await page.locator('[data-selection-action="favorite"]').click();
  await page.waitForSelector("#favorites-sec .collection-item");
  assert.equal(await page.locator("#favorites-count").innerText(), "1");
  const mainBox = await page.locator("main").boundingBox(), sideBox = await page.locator("aside#side").boundingBox();
  assert.ok(sideBox.x > mainBox.x, "the Arabic sidebar should be on the right");

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
  await page.waitForSelector("#annotations-sec .collection-item");
  const savedAnnotations = await page.evaluate(() => fetch("/api/state").then((response) => response.json()).then((state) => state.workspace.annotations));
  assert.equal(savedAnnotations.length, 2);
  assert.equal(await page.locator("#annotations-count").innerText(), "2");

  const secondFold = page.locator("#doc h2 .foldbtn").first();
  const foldRegionId = await secondFold.getAttribute("aria-controls");
  await secondFold.click();
  assert.equal(await secondFold.getAttribute("aria-expanded"), "false");
  await page.waitForTimeout(260);
  assert.equal(await page.locator(`#${foldRegionId}`).evaluate((el) => Math.round(el.getBoundingClientRect().height)), 0);

  const interactiveMapMark = page.locator("#documentmap .map-mark").nth(1);
  const mapTargetId = await interactiveMapMark.getAttribute("data-id");
  await interactiveMapMark.hover();
  await page.waitForSelector("#mappeek.show");
  assert.ok((await page.locator("#mappeek").innerText()).length > 0);
  await interactiveMapMark.click();
  await page.waitForFunction((id) => decodeURIComponent(location.hash.slice(1)) === id, mapTargetId);
  await page.locator("#maptoggle").click();
  assert.equal(await page.locator("#documentmap").getAttribute("class"), "document-map open");
  await page.locator("#doc").click({ position: { x: 30, y: 30 } });
  assert.equal(await page.locator("#documentmap").getAttribute("class"), "document-map");

  await page.locator("#actionsbtn").click();
  await page.locator('#filemenu [data-file-action="trash"]').click();
  await page.waitForSelector("#trashdialog[open]");
  assert.equal(await page.locator(":focus").getAttribute("id"), "trashcancel");
  await page.locator("#trashcancel").click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#sidebtn").click();
  assert.equal(await page.locator("body").evaluate((el) => el.classList.contains("side-open")), true);
  await page.locator("#sidebackdrop").click({ position: { x: 10, y: 100 } });
  assert.equal(await page.locator("body").evaluate((el) => el.classList.contains("side-open")), false);
  await context.close();
  console.log("playwright: selection actions, reading modes, folding, document map, RTL sidebar, menus, and mobile drawer passed");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  await rm(root, { recursive: true, force: true });
  await rm(dataDir, { recursive: true, force: true });
}
