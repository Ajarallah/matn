#!/usr/bin/env node
// Build the GitHub Pages site from source. Two outputs, one command:
//   site/landing.html  ->  docs/index.html      the landing page (Pages root)
//   src/index.html     ->  docs/try/index.html  the live reader demo
// The demo is client-only: no server, no file API — it renders a bundled sample
// and lets you open/drag your own .md. The landing page has the reader's own
// token block injected into it, so the identity cannot drift between the two.
// Run:  node scripts/build-docs.mjs
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(ROOT, "src", "index.html"), "utf8");
let s = src;

// 1) rewrite server routes -> relative vendored files
s = s.replace(/url\("\/fonts\//g, 'url("../vendor/fonts/');
s = s.replace('<script src="/marked.js"></script>', '<script src="../vendor/marked.min.js"></script>');
s = s.replace('<script src="/render-core.js"></script>', '<script src="../render-core.js"></script>');
s = s.replace('<script src="/annotation-core.js"></script>', '<script src="../annotation-core.js"></script>');
s = s.replace('<script src="/highlight.js"></script>', '<script src="../vendor/highlight.min.js"></script>');
s = s.replace('MERMAID_SRC="/mermaid.js"', 'MERMAID_SRC="../vendor/mermaid.min.js"');
s = s.replace('DOCX_SRC="/html-docx.js",ZIP_SRC="/jszip.js"', 'DOCX_SRC="../vendor/html-docx.min.js",ZIP_SRC="../vendor/jszip.min.js"');
s = s.replace('KATEX_JS="/katex.js",KATEX_CSS="/katex.css"', 'KATEX_JS="../vendor/katex.min.js",KATEX_CSS="../vendor/katex.min.css"');
s = s.replace('<script src="/marked-footnote.js"></script>', '<script src="../vendor/marked-footnote.umd.js"></script>');

s = s.replace('new Worker("/render-worker.js")', 'new Worker("../render-worker.js")');

// 2) header: swap the live-reload indicator for an open-file button + a GitHub link
const live = '<span class="live" id="live" role="status" title="يتابع تغييرات الملف تلقائيًا" aria-label="الاتصال بالتحديث التلقائي غير متاح"><span class="dot"></span><span class="sr-only" id="livestatus">التحديث التلقائي غير متصل</span></span>';
const openctrl = '<a class="iconbtn" href="https://github.com/Ajarallah/matn" target="_blank" rel="noopener" title="Matn on GitHub"><svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.4 6.7 19l1-5.8L3.5 9.2l5.9-.9z"/></svg><span class="lbl">GitHub</span></a>';
if (!s.includes(live)) { console.error("build-docs: live indicator markup not found — aborting"); process.exit(1); }
s = s.replace(live, openctrl);

// 3) the drop handler references #live (gone in the demo)
s = s.replace('$("live").classList.remove("on");', "");

// 4) bundled sample (non-executed markdown), inserted before marked loads
const SAMPLE = readFileSync(join(ROOT, "scripts", "demo-sample.md"), "utf8");
const sampleBlock = '<script type="text/markdown" id="sample">' + SAMPLE + '</script>\n';
// replacement via a function: the sample contains `$$` (math), a special pattern in
// String.replace string-replacements that would otherwise collapse to a single `$`.
s = s.replace('<script src="../vendor/marked.min.js"></script>', () => sampleBlock + '<script src="../vendor/marked.min.js"></script>');

// 5) replace the server-dependent boot block with a static boot
const anchor = "applyS();\nvar params=new URLSearchParams";
const i = s.indexOf(anchor);
const j = s.indexOf("</script>", i);
if (i < 0 || j < 0) { console.error("build-docs: boot block not found — aborting"); process.exit(1); }
const boot = `applyS();
var SAMPLE=(document.getElementById("sample")||{}).textContent||"";
$("fname").textContent="نموذج · متن";document.title="متن · Matn";
renderSafely(SAMPLE);
`; // file-open is handled by the app's own #fileinput listener
s = s.slice(0, i) + boot + "\n" + s.slice(j);

// 6) write docs/try/index.html (demo) + docs/index.html (landing) + shared assets
const DOCS = join(ROOT, "docs");
mkdirSync(join(DOCS, "vendor", "fonts"), { recursive: true });
mkdirSync(join(DOCS, "try"), { recursive: true });
writeFileSync(join(DOCS, "try", "index.html"), s, "utf8");
copyFileSync(join(ROOT, "src", "render-core.cjs"), join(DOCS, "render-core.js"));
copyFileSync(join(ROOT, "src", "annotation-core.cjs"), join(DOCS, "annotation-core.js"));
copyFileSync(join(ROOT, "src", "render-worker.js"), join(DOCS, "render-worker.js"));
copyFileSync(join(ROOT, "vendor", "marked.min.js"), join(DOCS, "vendor", "marked.min.js"));
copyFileSync(join(ROOT, "vendor", "highlight.min.js"), join(DOCS, "vendor", "highlight.min.js"));
copyFileSync(join(ROOT, "vendor", "mermaid.min.js"), join(DOCS, "vendor", "mermaid.min.js"));
copyFileSync(join(ROOT, "vendor", "html-docx.min.js"), join(DOCS, "vendor", "html-docx.min.js"));
copyFileSync(join(ROOT, "vendor", "jszip.min.js"), join(DOCS, "vendor", "jszip.min.js"));
for (const f of ["katex.min.js","katex-auto.min.js","katex.min.css","marked-footnote.umd.js"]) copyFileSync(join(ROOT, "vendor", f), join(DOCS, "vendor", f));
for (const f of readdirSync(join(ROOT, "vendor", "fonts")))
  copyFileSync(join(ROOT, "vendor", "fonts", f), join(DOCS, "vendor", "fonts", f));

// 7) the landing page, with the reader's own tokens injected so the identity
//    has exactly one source of truth.
const TOK_START = "/* tokens:start", TOK_END = "/* tokens:end */";
const ti = src.indexOf(TOK_START), tj = src.indexOf(TOK_END);
if (ti < 0 || tj < 0) { console.error("build-docs: token markers not found in src/index.html — aborting"); process.exit(1); }
const tokens = src.slice(ti, tj + TOK_END.length);

const FAVICON = /<link rel="icon" href="([^"]+)">/.exec(src);
if (!FAVICON) { console.error("build-docs: favicon not found in src/index.html — aborting"); process.exit(1); }

const BRAND = /<span class="brand" id="brand"[^>]*>([\s\S]*?)<\/span>/.exec(src);
if (!BRAND) { console.error("build-docs: brand mark not found in src/index.html — aborting"); process.exit(1); }
const markSvg = BRAND[1].replace(/class="brand-/g, 'class="mark-').replace("<svg ", '<svg class="mark" ');

const WM_VB = /var WORDMARK_VB=("(?:[^"\\]|\\.)*")/.exec(src);
const WM_D = /WORDMARK_D=("(?:[^"\\]|\\.)*")/.exec(src);
if (!WM_VB || !WM_D) { console.error("build-docs: wordmark path not found in src/index.html — aborting"); process.exit(1); }
const wordmarkSvg = '<svg class="wordmark" viewBox=' + WM_VB[1] + ' role="img" aria-label="\u0645\u062a\u0646">'
  + '<path d=' + WM_D[1] + '></path></svg>';

let landing = readFileSync(join(ROOT, "site", "landing.html"), "utf8");
for (const [needle, value] of [["/* @tokens */", tokens], ["@favicon@", FAVICON[1]],
                               ["@mark@", markSvg], ["@wordmark@", wordmarkSvg]]) {
  if (!landing.includes(needle)) { console.error("build-docs: landing placeholder " + needle + " missing — aborting"); process.exit(1); }
  landing = landing.split(needle).join(value);
}
writeFileSync(join(DOCS, "index.html"), landing, "utf8");

const checks = ["../vendor/marked.min.js", "../vendor/mermaid.min.js", "safeRenderer", "id=\"sample\""];
const missing = checks.filter((c) => !s.includes(c));
const landingChecks = ["--glass-tint", 'href="./try/"', "class=\"mark\"", "class=\"wordmark\""];
const landingMissing = landingChecks.filter((c) => !landing.includes(c));
console.log("build-docs: wrote docs/try/index.html (" + s.length + " bytes)");
console.log("build-docs: wrote docs/index.html (" + landing.length + " bytes, landing)");
console.log("build-docs: server refs left:", (s.match(/["']\/(api|marked|highlight|mermaid|fonts)/g) || []).length);
if (missing.length) { console.error("build-docs: MISSING in demo", missing); process.exit(1); }
if (landingMissing.length) { console.error("build-docs: MISSING in landing", landingMissing); process.exit(1); }
console.log("build-docs: ok");
