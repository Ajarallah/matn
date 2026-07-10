import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";
import { startServer } from "../src/server.mjs";
import {
  LARGE_DOCUMENT_BYTES,
  LARGE_WORKSPACE_FILES,
  generatePerformanceWorkspace,
} from "../scripts/performance-fixtures.mjs";

const moduleTarget = process.env.MATN_PLAYWRIGHT_PATH
  ? pathToFileURL(process.env.MATN_PLAYWRIGHT_PATH).href
  : "playwright";
const { chromium } = await import(moduleTarget);
const root = await mkdtemp(join(tmpdir(), "matn-performance-"));
const dataDir = await mkdtemp(join(tmpdir(), "matn-performance-state-"));
const fixture = await generatePerformanceWorkspace(root);
const server = await startServer({ port: 0, host: "127.0.0.1", defaultArg: root, dataDir });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__matnLongTasks = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) window.__matnLongTasks.push(entry.duration);
    }).observe({ type: "longtask", buffered: true });
  });

  const navigationStarted = performance.now();
  await page.goto(`${base}/?dir=${encodeURIComponent(root)}&path=${encodeURIComponent(fixture.largeFile)}`);
  await page.getByRole("heading", { name: "مستند الأداء المرجعي" }).waitFor({ timeout: 30_000 });
  const firstRenderMs = performance.now() - navigationStarted;

  let status = { indexing: true, total: 0 };
  const indexingStarted = performance.now();
  while (status.indexing && performance.now() - indexingStarted < 30_000) {
    status = await (await fetch(`${base}/api/search?q=&mode=files&limit=1`)).json();
    if (status.indexing) await new Promise((resolve) => setTimeout(resolve, 20));
  }
  const indexMs = performance.now() - indexingStarted;
  assert.equal(status.indexing, false, "workspace indexing must complete");
  assert.equal(status.total, LARGE_WORKSPACE_FILES + 2);

  const searchStarted = performance.now();
  const search = await (await fetch(`${base}/api/search?q=${encodeURIComponent("فريد-1999")}`)).json();
  const searchMs = performance.now() - searchStarted;
  assert.equal(search.results[0]?.rel, "notes/note-1999.md");
  assert.ok(searchMs <= 200, `indexed search exceeded 200ms: ${searchMs.toFixed(1)}ms`);

  const diagnosticsBefore = server.matnDiagnostics();
  await writeFile(join(root, "notes", "note-1999.md"), "# محدثة\n\nعلامة-تفاضلية.\n", "utf8");
  let updated = [];
  for (let attempt = 0; attempt < 100 && !updated.length; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 20));
    updated = (await (await fetch(`${base}/api/search?q=${encodeURIComponent("علامة-تفاضلية")}`)).json()).results;
  }
  assert.equal(updated[0]?.rel, "notes/note-1999.md");
  const diagnosticsAfter = server.matnDiagnostics();
  assert.equal(diagnosticsAfter.fullIndexes, diagnosticsBefore.fullIndexes, "one file update must not rebuild the workspace index");
  assert.ok(diagnosticsAfter.incrementalRecords - diagnosticsBefore.incrementalRecords <= 1, "one file update must refresh at most one record");

  const longTasks = await page.evaluate(() => window.__matnLongTasks.slice());
  assert.ok(Math.max(0, ...longTasks) <= 200, `large-document mode exceeded the 200ms long-task budget: ${Math.max(0, ...longTasks).toFixed(1)}ms`);
  const peakHeap = await page.evaluate(() => performance.memory?.usedJSHeapSize || null);
  const report = {
    fixture: { files: LARGE_WORKSPACE_FILES + 2, documentBytes: LARGE_DOCUMENT_BYTES },
    firstRenderMs: Math.round(firstRenderMs),
    indexMs: Math.round(indexMs),
    searchMs: Number(searchMs.toFixed(1)),
    longestTaskMs: Math.round(Math.max(0, ...longTasks)),
    longestTasksMs: longTasks.slice().sort((a, b) => b - a).slice(0, 5).map(Math.round),
    peakHeapBytes: peakHeap,
  };
  console.log(JSON.stringify(report, null, 2));
  await context.close();
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  await rm(root, { recursive: true, force: true });
  await rm(dataDir, { recursive: true, force: true });
}
