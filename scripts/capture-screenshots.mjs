#!/usr/bin/env node
// Capture the README screenshots (assets/, copied to docs/) and the desktop and mobile
// shots kept with the launch log (docs/goal/shots/), from a small Arabic workspace.
import { copyFile, mkdir, mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startServer } from "../src/server.mjs";
import { createStateStore } from "../src/state-store.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const shots = join(root, "docs", "goal", "shots");
await mkdir(shots, { recursive: true });
const dataDir = await mkdtemp(join(tmpdir(), "matn-screenshots-"));
const work = await realpath(await mkdtemp(join(tmpdir(), "matn-workspace-")));
const guide = join(work, "دليل-متن.md"), plan = join(work, "PLAN.md");
await copyFile(join(root, "scripts", "demo-sample.md"), guide);
await copyFile(join(root, "scripts", "demo-plan.md"), plan);
const at = Date.now();
await createStateStore({ dataDir }).updateWorkspace(work, { annotations: [
  { id: "n1", path: "PLAN.md", quote: "يسحب المهام كل ثانيتين", prefix: "كتابة عامل في src/workers/notify.ts ", heading: "الخطوات", color: "yellow", note: "لماذا الاستطلاع؟ يكفي LISTEN/NOTIFY في Postgres، فلا نحتاج إلى مؤقت.", createdAt: at, updatedAt: at },
  { id: "n2", path: "PLAN.md", quote: "خارج ساعات الذروة", heading: "المخاطر", color: "rose", note: "حدّد النافذة بالساعة، وأضف خطة تراجع إن طال القفل.", createdAt: at + 1, updatedAt: at + 1 }
] });

const server = await startServer({ port: 0, host: "127.0.0.1", defaultArg: work, dataDir });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const REVIEW = "0123456789abcdef0123456789abcdef";

async function open(page, file, extra = "") {
  // the reader keeps an SSE connection open for live reload, so networkidle never occurs
  await page.goto(`${base}/?path=${encodeURIComponent(file)}${extra}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#doc h1");
  await page.waitForFunction(() => document.fonts.status === "loaded");
  if (file === guide) await page.waitForSelector("#doc .mermaid svg");
  await page.waitForTimeout(500);
}

async function setTheme(page, theme) {
  await page.evaluate((value) => { localStorage.setItem("matn-theme", value); }, theme);
  await page.locator("#gearbtn").click();
  await page.locator(`[data-theme-val="${theme}"]`).click();
  await page.keyboard.press("Escape");
  await page.waitForFunction((value) => document.documentElement.dataset.theme === value, theme);
  await page.waitForTimeout(600);
}

async function shot(page, path) {
  await page.evaluate(() => { const s = document.getElementById("scroller") || document.scrollingElement; s.scrollTop = 0; });
  await page.waitForTimeout(150);
  await page.screenshot({ path, fullPage: false });
}

try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: "light" });
  const page = await desktop.newPage();
  await open(page, guide);
  for (const theme of ["light", "sepia", "dark"]) {
    await setTheme(page, theme);
    await shot(page, join(root, "assets", `screenshot-${theme}.png`));
  }
  await setTheme(page, "light");
  await page.locator("#gearbtn").click();
  await page.waitForSelector("#panel.open");
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(root, "assets", "screenshot-settings.png") });
  await page.keyboard.press("Escape");

  await open(page, plan, `&review=${REVIEW}&gate=1`);
  await shot(page, join(root, "assets", "screenshot-review.png"));
  for (const name of ["light", "sepia", "dark", "settings", "review"]) await copyFile(join(root, "assets", `screenshot-${name}.png`), join(root, "docs", `screenshot-${name}.png`));
  await copyFile(join(root, "assets", "screenshot-light.png"), join(shots, "desktop-light.png"));
  await copyFile(join(root, "assets", "screenshot-review.png"), join(shots, "desktop-review.png"));
  await open(page, guide);
  await setTheme(page, "night");
  await shot(page, join(shots, "desktop-night.png"));
  await setTheme(page, "light");
  await desktop.close();

  for (const scheme of ["light", "dark"]) {
    const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, colorScheme: scheme });
    const mobile = await phone.newPage();
    await open(mobile, guide);
    await setTheme(mobile, scheme);
    await shot(mobile, join(shots, `mobile-${scheme}.png`));
    if (scheme === "light") {
      await open(mobile, plan, `&review=${REVIEW}&gate=1`);
      await shot(mobile, join(shots, "mobile-review.png"));
      await mobile.locator("#sidebtn").click();
      await mobile.waitForTimeout(400);
      await mobile.screenshot({ path: join(shots, "mobile-library.png") });
    }
    await phone.close();
  }
  console.log("Captured assets/, docs/ and docs/goal/shots/.");
} finally {
  await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
  await rm(dataDir, { recursive: true, force: true });
  await rm(work, { recursive: true, force: true });
}
