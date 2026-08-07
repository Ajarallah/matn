#!/usr/bin/env node
import { copyFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startServer } from "../src/server.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = await mkdtemp(join(tmpdir(), "matn-screenshots-"));
const source = join(root, "scripts", "demo-sample.md");
const server = await startServer({
  port: 0,
  host: "127.0.0.1",
  defaultArg: source,
  dataDir
});
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });

async function setTheme(page, theme) {
  await page.locator("#gearbtn").click();
  await page.locator(`[data-theme-val="${theme}"]`).click();
  await page.keyboard.press("Escape");
  await page.waitForFunction((value) => document.documentElement.dataset.theme === value, theme);
}

async function capture(page, name) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: join(root, "assets", name), fullPage: false });
  await copyFile(join(root, "assets", name), join(root, "docs", name));
}

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: "light"
  });
  const page = await context.newPage();
  // The reader keeps an SSE connection open for live reload, so networkidle
  // never occurs. The rendered document is the reliable readiness signal.
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#documentmap .map-mark");
  await page.waitForFunction(() => document.fonts.status === "loaded");
  await page.waitForSelector("#doc .mermaid svg");

  await setTheme(page, "light");
  await capture(page, "screenshot-light.png");

  await setTheme(page, "sepia");
  await capture(page, "screenshot-sepia.png");

  await setTheme(page, "dark");
  await capture(page, "screenshot-dark.png");

  await setTheme(page, "light");
  await page.locator("#gearbtn").click();
  await page.waitForSelector("#panel.open");
  await capture(page, "screenshot-settings.png");

  await context.close();
  console.log("Captured current Matn UI in assets/ and docs/.");
} finally {
  await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
  await rm(dataDir, { recursive: true, force: true });
}
