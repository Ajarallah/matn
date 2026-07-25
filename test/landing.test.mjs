import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (...p) => readFileSync(join(ROOT, ...p), "utf8");

const src = read("src", "index.html");
const landingSrc = read("site", "landing.html");
const TOK_START = "/* tokens:start";
const TOK_END = "/* tokens:end */";

test("src/index.html keeps the token markers build-docs extracts", () => {
  const i = src.indexOf(TOK_START), j = src.indexOf(TOK_END);
  assert.ok(i >= 0, "tokens:start marker is missing");
  assert.ok(j > i, "tokens:end marker is missing or precedes the start");
  const block = src.slice(i, j + TOK_END.length);
  for (const theme of ["light", "sepia", "dark", "night"])
    assert.match(block, new RegExp(`html\\[data-theme="${theme}"\\]`),
      `the ${theme} theme must live inside the token block`);
  // the block has to stand alone — the landing page gets it with nothing else
  assert.ok(!block.includes("@media"), "the token block must not contain @media rules");
});

test("every theme defines the tokens the glass and the accents depend on", () => {
  const block = src.slice(src.indexOf(TOK_START), src.indexOf(TOK_END));
  const perTheme = block.split(/html\[data-theme="/).slice(1);
  assert.equal(perTheme.length, 4, "expected exactly four themes");
  for (const chunk of perTheme) {
    const name = chunk.slice(0, chunk.indexOf('"'));
    for (const token of ["--bg", "--ink", "--accent", "--on-accent",
                         "--glass-tint", "--glass-alpha", "--glass-edge"])
      assert.ok(chunk.includes(token + ":"), `${name} is missing ${token}`);
  }
});

test("no rule paints hardcoded white over the accent", () => {
  // #fff over the mint accents is 1.67:1 — --on-accent exists for this.
  const offenders = src.split("\n").filter((l) =>
    /background:var\(--accent\)/.test(l) && /color:#(fff|ffffff)\b/.test(l));
  assert.deepEqual(offenders, [], "use var(--on-accent) instead of #fff over var(--accent)");
});

test("the landing source carries every placeholder build-docs fills", () => {
  for (const needle of ["/* @tokens */", "@favicon@", "@mark@", "@wordmark@"])
    assert.ok(landingSrc.includes(needle), `site/landing.html is missing ${needle}`);
  assert.match(landingSrc, /href="\.\/try\/"/, "the landing page must link to the demo at ./try/");
});

test("the landing page is not shipped in the npm package", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.ok(!pkg.files.includes("site"),
    "site/ is landing-page source, not part of the CLI package");
});

// These only hold once build-docs has run. Skipped rather than failed on a fresh
// clone, so `npm test` does not depend on build order; CI runs build-docs anyway.
const built = existsSync(join(ROOT, "docs", "index.html")) &&
              existsSync(join(ROOT, "docs", "try", "index.html"));

test("the built landing page carries the reader's own tokens verbatim", { skip: !built }, () => {
  const landing = read("docs", "index.html");
  const block = src.slice(src.indexOf(TOK_START), src.indexOf(TOK_END) + TOK_END.length);
  assert.ok(landing.includes(block),
    "docs/index.html has drifted from src/index.html — re-run node scripts/build-docs.mjs");
});

test("the built demo sits at docs/try/ and references assets one level up", { skip: !built }, () => {
  const demo = read("docs", "try", "index.html");
  assert.match(demo, /id="sample"/, "the demo must bundle the sample document");
  assert.match(demo, /\.\.\/vendor\/marked\.min\.js/, "vendor paths must resolve to ../vendor/");
  assert.match(demo, /\.\.\/render-worker\.js/, "the web worker must resolve to ../render-worker.js");
  // a leftover absolute path would 404 on Pages
  assert.ok(!/src="\/(marked|highlight|render-core|annotation-core)/.test(demo),
    "the demo must not reference server-absolute script routes");
});

test("the built landing page is a landing page, not a second copy of the app",
  { skip: !built }, () => {
  const landing = read("docs", "index.html");
  assert.ok(!landing.includes('id="sample"'), "the landing page must not bundle the reader");
  assert.ok(!landing.includes("safeRenderer"), "the landing page must not bundle the renderer");
  assert.match(landing, /class="mark"/, "the landing page must carry the brand mark");
  assert.match(landing, /class="wordmark"/, "the landing page must carry the wordmark");
});
