#!/usr/bin/env node
// Regenerate the README and landing-page screenshots from the live app, so they
// can never drift from the current identity. Idempotent: same input, same bytes.
//   node scripts/screenshots.mjs
// Uses the playwright devDependency; set MATN_PLAYWRIGHT_PATH to point at a
// checkout that has it installed (a git worktree gets no node_modules of its own).
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "assets");
const DOCS = join(ROOT, "docs");

const moduleTarget = process.env.MATN_PLAYWRIGHT_PATH
  ? pathToFileURL(process.env.MATN_PLAYWRIGHT_PATH).href
  : "playwright";
const { chromium } = await import(moduleTarget);
const { startServer } = await import(pathToFileURL(join(ROOT, "src", "server.mjs")).href);

// A fixture that exercises what the shots are meant to show: RTL prose, a
// mixed-direction line, a callout, code, a table and nested headings.
const SAMPLE = `# دليل مشروع متن

هذا **دليل تجريبي** يعرض ما يفعله متن: عناوين، ونصًا عربيًا يقرأ من اليمين إلى
اليسار، وشيفرة تبقى لاتينية داخله، ومخططات وجداول.

> [!TIP]
> اتجاه كل فقرة يُحسم وحده. هذا السطر عربي وإن ذُكرت فيه كلمة Markdown.

## البداية السريعة

نصّب عبر \`npm\` ثم شغّل:

\`\`\`bash
npm install -g Ajarallah/matn
matn دليل.md
\`\`\`

## أمثلة كود

\`\`\`python
def greet(name: str) -> str:
    """ترحيب بسيط."""
    return f"مرحبًا يا {name}!"

print(greet("قارئ"))
\`\`\`

\`\`\`js
const sum = (a, b) => a + b;   // دالة سهمية
console.log(sum(2, 3));        // 5
\`\`\`

## جدول المقارنة

| الحقل | متن | غيره |
|---|---|---|
| الاتجاه | تلقائي لكل كتلة | يدوي |
| التحرير | قراءة فقط | يعدّل الملف |
| الشبكة | لا شيء | يرفع |

## قائمة المهام

- [x] اتجاه صحيح لكل فقرة
- [x] أربع سمات قراءة
- [ ] حزمة macOS موقّعة

### خاتمة

نهاية المستند التجريبي.
`;

const root = await mkdtemp(join(tmpdir(), "matn-shots-"));
const dataDir = await mkdtemp(join(tmpdir(), "matn-shots-state-"));
await mkdir(join(root, "docs"));
await writeFile(join(root, "دليل.md"), SAMPLE);
await writeFile(join(root, "docs", "guide.md"), "# الدليل\n## التثبيت\nخطوات.\n");

const server = await startServer({
  port: 0, host: "127.0.0.1", defaultArg: root, dataDir,
  allowFileActions: true, editor: "/editor",
  platformActions: { trash: async () => {}, reveal: async () => {}, openEditor: async () => {} },
});
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });

const READING = { font: "naskh", size: 18, lh: 1.85, measure: 112, align: "start", lang: "ar", focus: false, preset: "custom" };

async function shot(file, { theme, panel = false, width = 1280, height = 800 }) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.addInitScript((s) => localStorage.setItem("matn.reading", s),
    JSON.stringify({ ...READING, theme }));
  await page.goto(`${base}/?dir=${encodeURIComponent(root)}&path=${encodeURIComponent(join(root, "دليل.md"))}`);
  await page.waitForSelector("#doc h1");
  // let the embedded fonts settle, or the shots differ run to run
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
  if (panel) { await page.click("#gearbtn"); await page.waitForTimeout(500); }
  await page.screenshot({ path: file });
  await ctx.close();
  console.log("screenshots: wrote " + file.replace(ROOT + "/", ""));
}

await shot(join(OUT, "screenshot-light.png"), { theme: "light" });
await shot(join(OUT, "screenshot-sepia.png"), { theme: "sepia" });
await shot(join(OUT, "screenshot-dark.png"), { theme: "dark" });
await shot(join(OUT, "screenshot-settings.png"), { theme: "light", panel: true });
// the landing page shows the light shot; keep one copy inside docs/ so Pages
// serves it without reaching outside the published directory
await shot(join(DOCS, "screenshot-light.png"), { theme: "light" });

await browser.close();
await server.close?.();
await rm(root, { recursive: true, force: true });
await rm(dataDir, { recursive: true, force: true });
console.log("screenshots: ok");
