# Plan 003: Extract the pure render-pipeline functions into an importable module (no behavior change)

> **Executor instructions**: Follow step by step, run every verification command, honor STOP conditions, update this plan's row in `plans/README.md` when done. This is a **behavior-preserving refactor** — the rendered output and the demo must stay identical.
>
> **Drift check (run first)**: `git diff --stat 0046350..HEAD -- src/index.html src/server.mjs scripts/build-docs.mjs`
> If any changed, compare the excerpts below against the live code; on a mismatch, STOP.

## Status
- **Priority**: P1
- **Effort**: M
- **Risk**: MED (touches the highest-churn file on the hot render path — behavior must stay byte-identical)
- **Depends on**: none (but is the prerequisite for plans 004 and 005)
- **Category**: tech-debt / tests-enabler
- **Planned at**: commit `0046350`, 2026-07-08

## Why this matters

The entire client app — including the security-critical `esc`/`safeHref` and the most-regressed logic (`extractMath`, `docDir`) — lives inside one inline `<script>` in `src/index.html` (14 of 18 commits touch this file). Nothing in it is importable, so it has **zero automated tests** and no way to add any. This plan lifts the pure, DOM-free functions into a single-source module `src/render-core.cjs`, loaded by the browser and importable by Node tests, **without changing behavior**. It unblocks plans 004 (tests) and 005 (the code-block fix). It must honor the project's **zero-runtime-deps, zero-build** constraint: plain served static file, no bundler, no framework.

## Current state

The functions to move are already pure (DOM-free) or have a pure core. Their **current definitions** in `src/index.html`:

```js
// slug — src/index.html:436
function slug(t,i){return (t||"").trim().replace(/\s+/g,"-").replace(/[^\p{L}\p{N}-]/gu,"").slice(0,60)+"-"+i;}

// esc — src/index.html:577
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}

// safeHref — src/index.html:578-588
function safeHref(h,kind){
  h=String(h||"").trim().replace(/[\x00-\x1f\x7f\s]+/g,"");
  if(!h)return "";
  var low=h.toLowerCase();
  if(low[0]==="#"||low[0]==="/"||low.indexOf("./")===0||low.indexOf("../")===0)return h;
  var m=low.match(/^([a-z][a-z0-9+.-]*):/);
  if(!m)return h;
  if(kind==="img"&&low.indexOf("data:image/")===0&&!/^data:image\/(?:png|gif|jpe?g|webp);base64,/i.test(h))return "";
  if(kind==="img"&&low.indexOf("data:image/")===0)return h;
  return /^(https?|mailto|tel)$/.test(m[1])?h:"";
}

// safeRenderer — src/index.html:589-595  (depends on marked, esc, safeHref)
function safeRenderer(){
  var r=new marked.Renderer();
  r.html=function(html){return esc(html);};
  r.link=function(href,title,text){var u=safeHref(href,"link");if(!u)return text;return '<a href="'+esc(u)+'"'+(title?' title="'+esc(title)+'"':"")+'>'+text+"</a>";};
  r.image=function(href,title,text){var u=safeHref(href,"img");if(!u)return esc(text);return '<img src="'+esc(u)+'" alt="'+esc(text)+'"'+(title?' title="'+esc(title)+'"':"")+">";};
  return r;
}

// extractMath — src/index.html:550-556  ⚠ CONTAINS INVISIBLE U+E000 / U+E001 CHARS (see warning)
function extractMath(src){
  var store=[];
  src=src.replace(/\$\$([\s\S]+?)\$\$/g,function(_,tex){store.push({d:true,t:tex});return "<U+E000>"+(store.length-1)+"<U+E001>";});
  src=src.replace(/(^|[^\\$])\$([^\s$][^$\n]*?)\$/g,function(m0,pre,tex){if(!/[\\a-zA-Z]/.test(tex))return m0;store.push({d:false,t:tex});return pre+"<U+E000>"+(store.length-1)+"<U+E001>";});
  return {src:src,store:store};
}

// restoreMath — src/index.html:557  ⚠ regex uses U+E000 / U+E001
function restoreMath(html,store){return html.replace(/<U+E000>(\d+)<U+E001>/g,function(_,i){var m=store[+i];if(!m)return "";return '<span class="'+(m.d?"katex-block":"katex-inline")+'" data-tex="'+esc(m.t)+'"></span>';});}

// docDir — src/index.html:495-507 (mixes a pure vote with DOM gathering)
function docDir(doc){
  var blocks=doc.querySelectorAll("p,li,h1,h2,h3,h4,h5,h6,blockquote,dd,dt");
  var ar=0,lat=0;
  for(var i=0;i<blocks.length;i++){var el=blocks[i];
    if(el.closest("table,pre"))continue;
    var t=el.textContent||"";
    ar+=(t.match(/[؀-ۿݐ-ݿࢠ-ࣿ]/g)||[]).length;
    lat+=(t.match(/[A-Za-z]/g)||[]).length;}
  if(!ar&&!lat)return "rtl";
  return ar*2>=lat?"rtl":"ltr";
}

// parseFrontmatter — src/index.html:525-537 (mixes a pure parse with DOM card building)
```

**⚠ CRITICAL — U+E000 / U+E001:** `extractMath`/`restoreMath` use two invisible Private-Use-Area characters (U+E000, U+E001) as placeholder delimiters. In the excerpts above they are shown as `<U+E000>`/`<U+E001>` placeholders — **the real code contains the raw invisible chars**. When you move these two functions, **cut-and-paste their bodies verbatim from `src/index.html`; do NOT retype them** or you will silently lose the PUA chars and break math. Verify with the byte check in Step 4.

Serving/loading context you will mirror:
```js
// src/server.mjs:14  — how a vendored script is loaded into memory
const MARKED = readFileSync(join(VENDOR, "marked.min.js"), "utf8");
// src/server.mjs:112 — how it is served
    if (u.pathname === "/marked.js") return send(200, "text/javascript; charset=utf-8", MARKED);
// src/index.html:380-382 — the classic <script> tags (execute in order, before the inline app script)
<script src="/marked.js"></script>
<script src="/marked-footnote.js"></script>
<script src="/highlight.js"></script>
```
`package.json` has `"type": "module"`, so a CommonJS/UMD file MUST use the `.cjs` extension to be `require`/`import`-able in Node.

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Syntax | `node --check src/server.mjs` ; `node --check src/render-core.cjs` | exit 0 |
| Module smoke | `node -e "const c=require('./src/render-core.cjs'); console.log(typeof c.esc, typeof c.safeHref, typeof c.extractMath, typeof c.voteDir, typeof c.parseFrontmatter)"` | `function function function function function` |
| Tests | `npm test` | all pass (server tests unaffected) |
| Build demo | `node scripts/build-docs.mjs` | `build-docs: ok` |

## Scope

**In scope**:
- `src/render-core.cjs` (create)
- `src/index.html` (replace the 8 function definitions with aliases/adapters; add one `<script>` tag)
- `src/server.mjs` (one const + one route to serve `/render-core.js`)
- `scripts/build-docs.mjs` (copy the module into `docs/` and rewrite the tag)
- `docs/` (regenerated by the build — commit the result)

**Out of scope**:
- Do NOT change any function's LOGIC. This is a move + rewire only. (Plan 005 changes `extractMath`; not here.)
- Do NOT extract the CSS or the non-pure UI code (settings, TOC, export, search). Only the 8 functions listed.
- Do NOT add a bundler, `type=module` to the inline script, or any dependency.

## Git workflow
- Branch: `advisor/003-extract-render-core`
- Commit(s), e.g. `refactor: extract pure render functions into render-core.cjs (no behavior change)`.
- Do NOT push/PR unless instructed.

## Steps

### Step 1: Create `src/render-core.cjs` (UMD: Node exports + browser global `MatnCore`)

Create the file with this exact shape. Move `esc`, `safeHref`, `slug`, `safeRenderer`, `extractMath`, `restoreMath` verbatim (cut-paste `extractMath`/`restoreMath` — PUA chars). Add pure cores `voteDir` and `parseFrontmatter`:

```js
// src/render-core.cjs — pure render-pipeline core. UMD: require() in Node, window.MatnCore in the browser.
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;   // Node
  else root.MatnCore = api;                                                     // browser
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function esc(s){ /* verbatim from index.html:577 */ }
  function safeHref(h,kind){ /* verbatim from index.html:578-588 */ }
  function slug(t,i){ /* verbatim from index.html:436 */ }
  function safeRenderer(marked){ /* verbatim body from index.html:589-595, but take `marked` as a parameter */ }
  function extractMath(src){ /* CUT-PASTE verbatim from index.html:550-556 — PUA chars */ }
  function restoreMath(html,store){ /* CUT-PASTE verbatim from index.html:557 — PUA chars */ }

  // pure core of docDir: input = array of prose-block text strings; output = "rtl" | "ltr"
  function voteDir(texts){
    var ar=0,lat=0;
    for(var i=0;i<texts.length;i++){var t=texts[i]||"";
      ar+=(t.match(/[؀-ۿݐ-ݿࢠ-ࣿ]/g)||[]).length;
      lat+=(t.match(/[A-Za-z]/g)||[]).length;}
    if(!ar&&!lat)return "rtl";
    return ar*2>=lat?"rtl":"ltr";
  }

  // pure core of parseFrontmatter: returns {body, pairs} — NO DOM
  function parseFrontmatter(md){
    var m=/^[\s﻿]*---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/.exec(md);
    if(!m)return {body:md,pairs:[]};
    var body=md.slice(m[0].length),lines=m[1].split(/\r?\n/),pairs=[];
    for(var i=0;i<lines.length;i++){var mm=/^([A-Za-z0-9_.\- ]{1,40}):[ \t]*(.*)$/.exec(lines[i]);
      if(mm){var k=mm[1].trim(),v=mm[2].trim().replace(/^["']|["']$/g,"");if(k)pairs.push([k,v]);}}
    return {body:body,pairs:pairs};
  }

  return { esc:esc, safeHref:safeHref, slug:slug, safeRenderer:safeRenderer,
           extractMath:extractMath, restoreMath:restoreMath, voteDir:voteDir, parseFrontmatter:parseFrontmatter };
});
```

Keep the Arabic Unicode ranges in `voteDir` byte-identical to the source (`docDir:503`).

**Verify**: `node --check src/render-core.cjs` → exit 0. Run the "Module smoke" command → five `function`s.

### Step 2: Serve the module from the server

In `src/server.mjs`, add a const next to `MARKED` (line 14) and a route next to `/marked.js` (line 112):

```js
const RENDER_CORE = readFileSync(join(HERE, "render-core.cjs"), "utf8");   // near line 14
```
```js
    if (u.pathname === "/render-core.js") return send(200, "text/javascript; charset=utf-8", RENDER_CORE);   // near line 112
```
(`HERE` is already defined at `src/server.mjs:9` as the `src/` dir.)

**Verify**: `node --check src/server.mjs` → exit 0.

### Step 3: Rewire `src/index.html` to use `MatnCore`

1. Add the loader tag immediately after line 382 (`<script src="/highlight.js"></script>`), BEFORE `<script>"use strict";…`:
   ```html
   <script src="/render-core.js"></script>
   ```
2. Replace the six moved function DEFINITIONS with aliases (delete the old bodies):
   ```js
   var esc = MatnCore.esc;
   var safeHref = MatnCore.safeHref;
   var slug = MatnCore.slug;
   var extractMath = MatnCore.extractMath;
   var restoreMath = MatnCore.restoreMath;
   function safeRenderer(){ return MatnCore.safeRenderer(marked); }
   ```
   (Aliases keep every existing call site — `esc(...)`, `extractMath(...)`, `render()`'s use of `restoreMath`, etc. — working unchanged.)
3. Replace `docDir` (index.html:495-507) with a DOM-gathering wrapper over the pure core:
   ```js
   function docDir(doc){
     var blocks=doc.querySelectorAll("p,li,h1,h2,h3,h4,h5,h6,blockquote,dd,dt");
     var texts=[];
     for(var i=0;i<blocks.length;i++){if(!blocks[i].closest("table,pre"))texts.push(blocks[i].textContent||"");}
     return MatnCore.voteDir(texts);
   }
   ```
4. Replace `parseFrontmatter` (index.html:525-537) with a wrapper that builds the card from the pure `{body,pairs}`:
   ```js
   function parseFrontmatter(md){
     var r=MatnCore.parseFrontmatter(md);
     if(!r.pairs.length)return {body:r.body,card:null};
     var d=document.createElement("details");d.className="frontmatter";
     var s=document.createElement("summary");s.textContent=T("frontmatter");d.appendChild(s);
     var dl=document.createElement("dl");
     for(var j=0;j<r.pairs.length;j++){var dt=document.createElement("dt");dt.textContent=r.pairs[j][0];var dd=document.createElement("dd");dd.textContent=r.pairs[j][1]||"—";dd.setAttribute("dir","auto");dl.appendChild(dt);dl.appendChild(dd);}
     d.appendChild(dl);return {body:r.body,card:d};
   }
   ```

Keep the `render()` function (index.html:558) as-is for now — it still calls `parseFrontmatter`, `extractMath`, `restoreMath`, `safeRenderer` by their local names. (Plan 005 will change what happens inside it.)

### Step 4: Rebuild the demo and rewire its loader

In `scripts/build-docs.mjs`, add a route rewrite next to the other `s.replace('<script src="/marked.js">…')` lines (around build-docs.mjs:15) and a copy next to the vendored copies (around build-docs.mjs:54):

```js
s = s.replace('<script src="/render-core.js"></script>', '<script src="./render-core.js"></script>');   // route rewrite
```
```js
copyFileSync(join(ROOT, "src", "render-core.cjs"), join(DOCS, "render-core.js"));   // copy into docs/
```

Then run `node scripts/build-docs.mjs`.

**Verify — PUA integrity** (must pass, proves the move preserved the placeholder chars):
```
node -e "const s=require('fs').readFileSync('src/render-core.cjs','utf8'); if(!s.includes('\uE000')||!s.includes('\uE001')){console.error('PUA MISSING'); process.exit(1)} console.log('PUA ok')"
```
Expected: `PUA ok`. If it prints `PUA MISSING`, you retyped the math functions — redo Step 1 by cut-pasting.

**Verify — build**: `node scripts/build-docs.mjs` → `build-docs: ok`; and `docs/render-core.js` exists.

### Step 5: Prove no behavior change (round-trip smoke)

```
node -e "const c=require('./src/render-core.cjs'); \
 const {src,store}=c.extractMath('inline \$\\\\alpha\$ and block \$\$x^2\$\$'); \
 console.log(store.length===2, c.restoreMath(src,store).includes('katex-block')); \
 console.log(c.safeHref('javascript:alert(1)','link')===''); \
 console.log(c.esc('<b>&\"')==='&lt;b&gt;&amp;&quot;'); \
 console.log(c.voteDir(['مرحبا Context'])==='rtl', c.voteDir(['hello world'])==='ltr'); \
 console.log(c.parseFrontmatter('---\ntitle: X\n---\nbody').pairs.length===1);"
```
Expected: every line prints `true` (or `true true`). These are sanity checks; the full suite is plan 004.

## Test plan
- No formal test file in THIS plan — it is the enabling refactor. The smoke commands in Steps 4-5 are the gate. Plan 004 adds `test/*.test.mjs`.

## Done criteria (ALL must hold)
- [ ] `node --check src/render-core.cjs` and `node --check src/server.mjs` exit 0
- [ ] `node -e "…typeof…"` smoke prints five `function`s
- [ ] PUA integrity check prints `PUA ok`
- [ ] Step 5 round-trip smoke prints all `true`
- [ ] `npm test` exits 0
- [ ] `node scripts/build-docs.mjs` prints `build-docs: ok`; `docs/render-core.js` exists; `git diff --exit-code -- docs/` is only the expected new/changed demo files (no unrelated drift)
- [ ] `src/index.html` no longer DEFINES `esc`/`safeHref`/`slug`/`extractMath`/`restoreMath` (they are aliases) and `docDir`/`parseFrontmatter` call `MatnCore.*`
- [ ] `plans/README.md` status row for 003 updated to DONE

## STOP conditions (stop and report)
- The PUA integrity check fails after a cut-paste retry (the placeholder chars won't survive your editor).
- The drift check shows `src/index.html` diverged from the excerpts (someone changed these functions since `0046350`).
- Any Step-5 smoke line prints `false` — a behavior change slipped in; do not proceed.
- You cannot load `/render-core.js` before the inline script runs (MatnCore undefined at runtime) — the `<script>` ordering is wrong; fix ordering, don't add defensive fallbacks.

## Maintenance notes
- After this lands, add `&& node --check src/render-core.cjs` to the `check` script from plan 002.
- **Single source of truth**: `src/render-core.cjs` is served to the browser AND imported by tests — never fork a second copy. If a function changes, it changes here.
- A reviewer must confirm: the demo still renders (open `docs/index.html`), math still shows, direction still correct — this refactor is only safe if output is identical.
