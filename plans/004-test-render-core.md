# Plan 004: Characterization tests lock in the sanitizer, direction, and math behavior

> **Executor instructions**: Follow step by step, run every verification command, honor STOP conditions, update this plan's row in `plans/README.md` when done.
>
> **Drift check (run first)**: confirm plan 003 is DONE and `src/render-core.cjs` exists and exports `esc, safeHref, extractMath, restoreMath, voteDir, parseFrontmatter`. Run: `node -e "const c=require('./src/render-core.cjs'); console.log(['esc','safeHref','extractMath','restoreMath','voteDir','parseFrontmatter'].every(k=>typeof c[k]==='function'))"` → must print `true`. If not, STOP — plan 003 must land first.

## Status
- **Priority**: P1
- **Effort**: M
- **Risk**: LOW (additive tests only — no production code changes)
- **Depends on**: plans/003 (the functions must be importable)
- **Category**: tests
- **Planned at**: commit `0046350`, 2026-07-08

## Why this matters

`src/render-core.cjs` holds the app's security guarantees (`esc`, `safeHref` — the sole XSS/scheme defense, exactly what `SECURITY.md` promises) and its most-regressed logic (`voteDir` direction voting was re-fixed across v1.1.0/v1.1.1/v1.2.2; `extractMath` shipped two real bugs recorded in the CHANGELOG). None of it has a single test. A `marked` upgrade or a careless edit could silently re-open HTML injection or re-break direction/math with nothing failing. This plan adds a characterization suite that turns those invariants into executable proof, so plan 005 (and every future edit) has a safety net.

## Current state

- `src/render-core.cjs` exists (from plan 003), a CommonJS/UMD module. Import it in Node ESM tests via a default import: `import core from "../src/render-core.cjs";` then `core.esc(...)`, `core.safeHref(...)`, etc.
- Existing tests: `test/server.test.mjs` uses `node:test` + `node:assert/strict`. Model the new file's structure on it (`import test from "node:test"; import assert from "node:assert/strict";`).
- Behavior to pin (from the source of truth in `src/render-core.cjs`):
  - `esc("<b>&\"'")` → `&lt;b&gt;&amp;&quot;&#39;` (escapes `& < > " '`).
  - `safeHref` blocks `javascript:`, `vbscript:`, unknown schemes, and `data:` for links; allows `https`/`http`/`mailto`/`tel`, relative (`#`, `/`, `./`, `../`) and no-scheme; for images allows only `data:image/(png|gif|jpe?g|webp);base64,…` and blocks `data:image/svg+xml`; strips ASCII control chars + whitespace first (so `java\tscript:` obfuscation is caught).
  - `extractMath` pulls block `$$…$$` and inline `$…$` (only when the span contains `\` or a letter — pure numbers are skipped), returns `{src, store}` with invisible U+E000/U+E001 placeholders; `restoreMath(src, store)` turns them into `<span class="katex-block|katex-inline" data-tex="…">` with the tex `esc`'d.
  - `voteDir(texts)`: Arabic-leaning — returns `"rtl"` unless Latin letters strictly dominate (`ar*2 < lat`); empty input → `"rtl"`.
  - `parseFrontmatter(md)` → `{body, pairs}`; leading `---\n…\n---\n` becomes `pairs` (array of `[key,value]`), body is the remainder; no frontmatter → `{body: md, pairs: []}`.

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Run new tests | `npm test` | all pass, including the new file |
| Run just this file | `node --test test/render-core.test.mjs` | pass |

## Scope

**In scope**:
- `test/render-core.test.mjs` (create)

**Out of scope**:
- `src/render-core.cjs`, `src/index.html` — do NOT change production code. If a test reveals a bug, WRITE THE TEST to document current behavior and note it, but do not fix it here (the known math/code-block bug is plan 005). This plan pins behavior; it doesn't change it.
- Do not test `safeRenderer` end-to-end through `marked` (marked isn't a Node import here) — `esc`/`safeHref` ARE the sanitization logic and are covered directly.

## Git workflow
- Branch: `advisor/004-test-render-core`
- One commit, e.g. `test: characterization tests for sanitizer, direction, and math core`.
- Do NOT push/PR unless instructed.

## Steps

### Step 1: Write `test/render-core.test.mjs`

Create the file importing the module and asserting the contract. Cover at minimum these cases (group with multiple `test(...)` blocks):

**Sanitizer — `esc`:**
- `esc("<b>&\"'")` equals `&lt;b&gt;&amp;&quot;&#39;`.
- `esc(null)` and `esc(undefined)` equal `""` (no throw).

**Sanitizer — `safeHref` (the security core; these MUST hold):**
- Blocked (→ `""`): `javascript:alert(1)`, `vbscript:msgbox(1)`, `data:text/html,x`, `data:image/svg+xml,x` (as `img`), an unknown scheme like `foo:bar`.
- Allowed (→ unchanged, non-empty): `https://x.example`, `http://x`, `mailto:a@b.c`, `tel:123`, `#anchor`, `/abs`, `./rel`, `../up`, a bare `page.md` (no scheme).
- Image allowlist: `safeHref("data:image/png;base64,AAAA","img")` is non-empty; `safeHref("data:image/svg+xml;base64,AAAA","img")` is `""`.
- Obfuscation: a `javascript:` with an embedded tab/newline (e.g. `"java\tscript:alert(1)"`) → `""` (control chars stripped before scheme check).

**Math — `extractMath` / `restoreMath`:**
- Inline: `extractMath("a $x$ b")` → `store.length === 1`, `store[0].d === false`, `store[0].t === "x"`.
- Block: `extractMath("$$y^2$$")` → `store[0].d === true`, `store[0].t === "y^2"`.
- Pure number is NOT math: `extractMath("costs $5$")`... note `$5$` → tex `5`, no letter/backslash → skipped, `store.length === 0`.
- Backslash survives: `extractMath("$\\alpha$").store[0].t === "\\alpha"`.
- Round-trip: for `extractMath("$x$")`, `restoreMath(src, store)` contains `class="katex-inline"` and `data-tex="x"`.
- Attribute escaping: `restoreMath` of a tex containing `"` produces `&quot;` in the `data-tex` value (no attribute breakout).

**Direction — `voteDir`:**
- `voteDir(["مرحبا بالعالم"])` → `"rtl"`.
- `voteDir(["Context لماذا نبني هذا"])` → `"rtl"` (Arabic-leaning: a Latin-first Arabic line stays RTL).
- `voteDir(["hello world this is english"])` → `"ltr"`.
- `voteDir([])` and `voteDir([""])` → `"rtl"`.

**Frontmatter — `parseFrontmatter`:**
- `parseFrontmatter("---\ntitle: X\nauthor: Y\n---\nbody text")` → `pairs` deep-equals `[["title","X"],["author","Y"]]`, `body === "body text"`.
- No frontmatter: `parseFrontmatter("# just a doc")` → `{body: "# just a doc", pairs: []}`.
- Leading blank line tolerated: `parseFrontmatter("\n---\ntitle: X\n---\nb")` → `pairs.length === 1`.

**Verify**: `node --test test/render-core.test.mjs` → all pass. `npm test` → all pass (server tests + new file).

## Test plan
- The file IS the test plan. ~20-25 assertions across 5 groups. Pattern: `test/server.test.mjs` structure.
- Verification: `npm test` → all pass, new file included.

## Done criteria (ALL must hold)
- [ ] `test/render-core.test.mjs` exists and imports `../src/render-core.cjs`
- [ ] `node --test test/render-core.test.mjs` passes
- [ ] `npm test` exits 0 with the new file included
- [ ] All five groups (esc, safeHref, math, voteDir, parseFrontmatter) have assertions
- [ ] No production files changed (`git status` shows only the new test file)
- [ ] `plans/README.md` status row for 004 updated to DONE

## STOP conditions (stop and report)
- The drift-check import fails (plan 003 not landed / module shape differs) — STOP.
- A `safeHref` "blocked" case does NOT return `""` (i.e. the sanitizer is weaker than documented) — this is a real security finding: keep the failing assertion, mark the test `todo`/skip with a clear note, and REPORT it rather than weakening the test to green.
- Any math assertion contradicts the current source behavior — pin the ACTUAL current behavior and note the discrepancy for plan 005; do not "fix" the source here.

## Maintenance notes
- After plan 005 tightens the math/code-block handling, its new cases get added here (or in a sibling `test/math-codeblocks.test.mjs`).
- These tests are the guardrail for any future `marked` upgrade: if the upgrade changes the renderer signature, `safeRenderer` breaks and these (plus a manual render check) are how you'd catch it — consider adding a marked-integration test if marked ever becomes Node-importable.
