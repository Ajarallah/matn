import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const moduleTarget = process.env.MATN_PLAYWRIGHT_PATH
  ? pathToFileURL(process.env.MATN_PLAYWRIGHT_PATH).href
  : "playwright";
const { chromium, webkit } = await import(moduleTarget);
const docs = resolve(fileURLToPath(new URL("../docs/", import.meta.url)));
const types = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".woff2", "font/woff2"]
]);

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    const requested = decodeURIComponent(url.pathname);
    let target = resolve(docs, "." + requested);
    if (target !== docs && !target.startsWith(docs + sep)) throw new Error("outside docs");
    const info = await stat(target).catch(() => null);
    if (info?.isDirectory()) target = join(target, "index.html");
    const body = await readFile(target);
    response.writeHead(200, {
      "content-type": types.get(extname(target)) || "application/octet-stream",
      "cache-control": "no-store"
    });
    response.end(body);
  } catch {
    response.writeHead(404, { "content-type": "text/plain" });
    response.end("not found");
  }
});
await new Promise((resolveServer) => server.listen(0, "127.0.0.1", resolveServer));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "light" });
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: base });
  const page = await context.newPage();
  await page.goto(base + "/");
  assert.equal(await page.locator("html").getAttribute("lang"), "ar");
  assert.equal(await page.locator("html").getAttribute("dir"), "rtl");
  assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
  assert.equal(await page.locator('a[href="./demo/"]').count(), 2);
  assert.match(await page.locator("h1").innerText(), /ماركداون عربي/);

  await page.locator("#language-toggle").click();
  assert.equal(await page.locator("html").getAttribute("lang"), "en");
  assert.equal(await page.locator("html").getAttribute("dir"), "ltr");
  assert.match(await page.locator("h1").innerText(), /Arabic Markdown/);
  assert.equal(await page.locator("#theme-toggle").getAttribute("aria-label"), "Use dark mode");
  assert.equal(await page.locator(".hero-product").getAttribute("aria-label"), "Matn interface preview");
  assert.match(await page.locator('meta[name="description"]').getAttribute("content"), /Arabic-first/);

  await page.locator("#theme-toggle").click();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  assert.equal(await page.locator("#theme-toggle").getAttribute("aria-label"), "Use light mode");

  await page.locator("#copy-install").click();
  await page.waitForFunction(async () => (await navigator.clipboard.readText()).includes("npm install"));
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), "npm install -g Ajarallah/matn");
  assert.equal(await page.locator("#copy-status").innerText(), "Copied");

  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
  await page.reload();
  await page.keyboard.press("Tab");
  assert.equal(await page.locator(":focus").getAttribute("class"), "skip-link");

  await page.goto(base + "/demo/");
  await page.waitForSelector("#doc h1");
  assert.match(await page.locator("#doc h1").innerText(), /متن/);
  assert.equal(await page.locator(".app-brand img").getAttribute("src"), "../brand/mark.svg");
  assert.equal((await page.locator(".app-brand img").evaluate((image) => image.naturalWidth)) > 0, true);
  await context.close();

  const reduced = await browser.newContext({ reducedMotion: "reduce" });
  const reducedPage = await reduced.newPage();
  await reducedPage.goto(base + "/");
  assert.equal(await reducedPage.locator("html").evaluate((node) => node.classList.contains("matn-low-power")), true);
  await reduced.close();

  const safari = await webkit.launch({ headless: true });
  try {
    const safariPage = await safari.newPage({ viewport: { width: 390, height: 844 }, colorScheme: "light" });
    await safariPage.goto(base + "/");
    assert.equal(await safariPage.locator("html").getAttribute("lang"), "ar");
    await safariPage.locator("#language-toggle").click();
    assert.equal(await safariPage.locator("html").getAttribute("dir"), "ltr");
    await safariPage.locator("#theme-toggle").click();
    assert.equal(await safariPage.locator("html").getAttribute("data-theme"), "dark");
    assert.equal(await safariPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    await safariPage.goto(base + "/demo/");
    await safariPage.waitForSelector("#doc h1");
    assert.equal((await safariPage.locator(".app-brand img").evaluate((image) => image.naturalWidth)) > 0, true);
  } finally {
    await safari.close();
  }
  console.log("playwright: landing languages, themes, clipboard, mobile layout, reduced motion, WebKit, and /demo passed");
} finally {
  await browser.close();
  await new Promise((resolveServer) => server.close(resolveServer));
}
