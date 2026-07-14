# Plan 005: Math and `<div>` preprocessing no longer corrupt fenced/inline code (or two-price prose)

> **Executor instructions**: Follow step by step, run every verification command, honor STOP conditions, update this plan's row in `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat 0046350..HEAD -- src/index.html`, and confirm plans 003 + 004 are DONE (`test/render-core.test.mjs` exists and `npm test` passes; `src/render-core.cjs` exports `extractMath`). If 003/004 aren't landed, STOP.

## Status
- **Priority**: P1
- **Effort**: M
- **Risk**: MED (changes the core preprocessing on the hot render path)
- **Depends on**: plans/003 (math lives in `render-core.cjs`), plans/004 (safety-net tests)
- **Category**: correctness (content corruption)
- **Planned at**: commit `0046350`, 2026-07-08

## Why this matters

Two preprocessors run on the **raw Markdown before `marked`**, blind to code regions, and corrupt legitimate content (both confirmed by running the exact regexes):

1. **Math extraction** pulls `$$…$$` and `$…$` out of fenced code blocks. A `bash` block with `echo $$ … total=$$…` gets a chunk captured as "math" and replaced with a placeholder inside `<pre><code>`. Prose with two prices — `costs $5 and $10` — captures `5 and ` as math (it contains a letter) and renders `costs [math]0`.
2. **The `<div>`-strip** (added in v1.2.7 for the GitHub RTL wrapper) removes any standalone `<div …>`/`</div>` line — **including inside a fenced code block**, so a tutorial showing an HTML `<div dir="rtl">` loses those lines.

Impact: any document that shows HTML, shell, Perl/PHP, Makefile, or LaTeX **inside a code block**, or two currency amounts in one line of prose, is silently mangled. This plan makes both preprocessors skip code regions and tightens the currency guard, while keeping real math and the GitHub-wrapper stripping intact.

## Current state

After plan 003, the math functions live in `src/render-core.cjs` and `render()` in `src/index.html` still does the inline `<div>`-strip and calls `extractMath`:

```js
// src/index.html:558-559 (render — as of plan 003)
function render(md){lastMD=md;var fm=parseFrontmatter(md);/* drop standalone layout-wrapper div tags … */var body=fm.body.replace(/^[ \t]*<\/?div\b[^>]*>[ \t]*$/gim,"");var mx=extractMath(body);
  var doc=$("doc");doc.innerHTML=restoreMath(marked.parse(mx.src,{renderer:safeRenderer()}),mx.store);
```

`extractMath` in `src/render-core.cjs` (moved verbatim in 003, PUA placeholders):
```js
function extractMath(src){
  var store=[];
  src=src.replace(/\$\$([\s\S]+?)\$\$/g,function(_,tex){store.push({d:true,t:tex});return "<U+E000>"+(store.length-1)+"<U+E001>";});
  src=src.replace(/(^|[^\\$])\$([^\s$][^$\n]*?)\$/g,function(m0,pre,tex){if(!/[\\a-zA-Z]/.test(tex))return m0;store.push({d:false,t:tex});return pre+"<U+E000>"+(store.length-1)+"<U+E001>";});
  return {src:src,store:store};
}
```
(`<U+E000>`/`<U+E001>` are the invisible PUA chars — preserve them; cut-paste, never retype.)

Empirical confirmation of the bugs (you can reproduce): running the block-math regex on `"echo $$   # PID\ntotal=$$sum"` captures `"   # PID\ntotal="`; running the `<div>`-strip on a fenced block containing a lone `<div dir="rtl">` line deletes it.

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Module smoke | `node -e "…preprocess…"` (see Step 3) | prints `true` lines |
| Tests | `npm test` | all pass incl. new code-block cases |
| Build demo | `node scripts/build-docs.mjs` | `build-docs: ok` |
| Syntax | `node --check src/render-core.cjs` | exit 0 |

## Scope

**In scope**:
- `src/render-core.cjs` — add `preprocess(body)`; add the currency-guard lookahead to `extractMath` and give it an optional shared `store` param.
- `src/index.html` — `render()` calls `MatnCore.preprocess(fm.body)` instead of the inline `<div>`-strip + `extractMath`.
- `test/render-core.test.mjs` — add the code-block / currency cases (or a sibling `test/preprocess.test.mjs`).
- `scripts/build-docs.mjs` output `docs/` — regenerate (via `node scripts/build-docs.mjs`), commit.

**Out of scope**:
- Do NOT touch `restoreMath`, `safeRenderer`, `esc`, `safeHref`, `voteDir`, `parseFrontmatter`.
- Do NOT try to also handle 4-space **indented** code blocks — fenced (```` ``` ````/`~~~`) and single-backtick inline code only; note the indented-code limitation in maintenance notes (rare, and out of scope here).

## Git workflow
- Branch: `advisor/005-protect-code-blocks`
- Commit, e.g. `fix: skip code regions in math/div preprocessing; tighten currency guard`.
- Do NOT push/PR unless instructed.

## Steps

### Step 1: In `render-core.cjs`, make `extractMath` reusable + currency-safe

Change `extractMath` to (a) accept an optional shared `store`, and (b) reject an inline `$…$` whose closing `$` is immediately followed by a digit (the two-price case). Keep the PUA placeholders (cut-paste). Target shape:

```js
function extractMath(src, store){
  store = store || [];
  src = src.replace(/\$\$([\s\S]+?)\$\$/g, function(_,tex){ store.push({d:true,t:tex}); return PUA0 + (store.length-1) + PUA1; });
  src = src.replace(/(^|[^\\$])\$([^\s$][^$\n]*?)\$(?![0-9])/g, function(m0,pre,tex){
    if(!/[\\a-zA-Z]/.test(tex)) return m0;
    store.push({d:false,t:tex}); return pre + PUA0 + (store.length-1) + PUA1;
  });
  return { src:src, store:store };
}
```
(`PUA0`/`PUA1` = the two invisible chars, inline in the string literals exactly as before. The only edits vs 003 are the `store` param, the default, and `(?![0-9])` on the inline closing `$`.)

### Step 2: In `render-core.cjs`, add code-aware `preprocess(body)`

Add and export a `preprocess` that splits the body into code vs prose regions, applies the `<div>`-strip and `extractMath` to prose only, and leaves code untouched (so `marked` still renders it):

```js
function preprocess(body){
  var store = [];
  var codeRe = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`)/g;   // fenced + inline code
  function prose(seg){
    seg = seg.replace(/^[ \t]*<\/?div\b[^>]*>[ \t]*$/gim, "");  // drop GitHub layout-wrapper div lines
    return extractMath(seg, store).src;                         // math into the shared store
  }
  var out = "", last = 0, m;
  while ((m = codeRe.exec(body))) { out += prose(body.slice(last, m.index)); out += m[0]; last = m.index + m[0].length; }
  out += prose(body.slice(last));
  return { src: out, store: store };
}
```
Add `preprocess` to the module's returned object.

**Verify**: `node --check src/render-core.cjs` → exit 0.

### Step 3: Smoke-test the fix at the module level

Write a scratch `smoke.mjs` (delete after), or run equivalently, asserting the corruption is gone and real math still works:

```js
import core from "./src/render-core.cjs";
const codeDoc = "```html\n<div dir=\"rtl\">\nx\n</div>\n```\n\n```bash\necho $$ total=$$sum\n```";
const a = core.preprocess(codeDoc);
console.log("div in code kept:", a.src.includes('<div dir="rtl">') === true);
console.log("no math from code:", a.store.length === 0);
const b = core.preprocess("costs $5 and $10 today");
console.log("two prices kept:", b.store.length === 0 && b.src.includes("$5 and $10"));
const c = core.preprocess("real $x$ and $$y^2$$ math");
console.log("real math extracted:", c.store.length === 2);
```
**Expected**: all four lines print `... true`.

### Step 4: Wire `render()` to `preprocess`

In `src/index.html`, change the start of `render()` (line 558) from the inline div-strip + `extractMath` to a single `preprocess` call:

```js
function render(md){lastMD=md;var fm=parseFrontmatter(md);var mx=MatnCore.preprocess(fm.body);
  var doc=$("doc");doc.innerHTML=restoreMath(marked.parse(mx.src,{renderer:safeRenderer()}),mx.store);
```
(Remove the `fm.body.replace(/…div…/)` line and the `extractMath(body)` call; `mx` now comes from `preprocess`. The `extractMath` alias may remain unused in `index.html` — remove the now-orphaned alias line if present, or leave it; it is harmless.)

### Step 5: Rebuild the demo

`node scripts/build-docs.mjs` → `build-docs: ok`. Confirm `docs/render-core.js` reflects the new `preprocess` (it is copied from `src/render-core.cjs`).

## Test plan
Add to `test/render-core.test.mjs` (or `test/preprocess.test.mjs`), using `import core from "../src/render-core.cjs"`:
- **Code fences preserved**: a ```` ```html ```` block containing a lone `<div dir="rtl">` line → `preprocess(...).src` still contains `<div dir="rtl">`; `.store.length === 0`.
- **Shell `$$` in code preserved**: a ```` ```bash ```` block with `echo $$ … $$` → `.store.length === 0` and the `$$` text remains in `.src`.
- **Inline code preserved**: `` `$x$` `` inline code → not extracted (`.store.length === 0`).
- **Two prices in prose**: `costs $5 and $10` → `.store.length === 0`, text intact.
- **Real math still works**: `$x$` → 1 inline; `$$y^2$$` → 1 block; mixed prose+math extracts the right count.
- **GitHub wrapper still stripped in prose**: a standalone `<div dir="rtl">` line **outside** any code block → removed from `.src`.
- Keep all existing plan-004 assertions passing.

**Verify**: `npm test` → all pass, including the new cases.

## Done criteria (ALL must hold)
- [ ] `node --check src/render-core.cjs` exits 0; PUA integrity still holds (`node -e "const s=require('fs').readFileSync('src/render-core.cjs','utf8');process.exit(s.includes('\uE000')&&s.includes('\uE001')?0:1)"` exits 0)
- [ ] Step 3 smoke prints all `true`
- [ ] `npm test` passes with the new code-block/currency tests
- [ ] `render()` in `src/index.html` calls `MatnCore.preprocess(fm.body)` and no longer has the inline `<div>`-strip or `extractMath(body)` call
- [ ] `node scripts/build-docs.mjs` → `build-docs: ok`; `git diff --exit-code -- docs/` clean after the rebuild is committed
- [ ] `plans/README.md` status row for 005 updated to DONE

## STOP conditions (stop and report)
- The PUA integrity check fails (placeholder chars lost in editing).
- Step 3 shows real math no longer extracted (`real math extracted: false`) — the code-splitting is eating prose; do not proceed.
- A code block that legitimately contains a real math example the author WANTED rendered is now shown literally — this is the intended trade-off (code is literal), but if a plan-004 assertion breaks, report rather than loosening it.
- The `codeRe` split desynchronizes math-store indices (a placeholder index in `.src` has no matching `store` entry) — visible as deleted content after `restoreMath`; STOP and report.

## Maintenance notes
- **Known limitation** (documented, not fixed here): 4-space **indented** code blocks are not masked — a lone `<div>` or `$$` in indented code can still be affected. Rare; a follow-up could mask indented code too, or (the cleaner long-term fix) move math to a `marked` inline extension so the lexer never offers code to it.
- `extractMath` and `preprocess` share the inline-math regex; if you change one, check the other.
- A reviewer should confirm real Arabic docs with math (e.g. `scripts/demo-sample.md`) still render math correctly after this change — open the rebuilt `docs/index.html`.
