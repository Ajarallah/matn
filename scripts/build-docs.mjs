#!/usr/bin/env node
// Build the GitHub Pages site:
//   docs/       bilingual product landing page
//   docs/demo/  client-only Matn reader demo
// Run: node scripts/build-docs.mjs
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, rmSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const SITE = join(ROOT, "site");
const VENDOR = join(ROOT, "vendor");
const DOCS = join(ROOT, "docs");
const DEMO = join(DOCS, "demo");

rmSync(DOCS, { recursive: true, force: true });
mkdirSync(join(DOCS, "brand"), { recursive: true });
mkdirSync(join(DOCS, "vendor", "fonts"), { recursive: true });
mkdirSync(DEMO, { recursive: true });

// 1) Landing page and its dependency-free assets.
for (const file of ["index.html", "landing.css", "site.js", "og-cover.svg"])
  copyFileSync(join(SITE, file), join(DOCS, file));
if (existsSync(join(SITE, "og-cover.png")))
  copyFileSync(join(SITE, "og-cover.png"), join(DOCS, "og-cover.png"));

for (const file of ["brand.css", "brand-glass.js"])
  copyFileSync(join(SRC, file), join(DOCS, file));
for (const file of readdirSync(join(SRC, "brand")))
  copyFileSync(join(SRC, "brand", file), join(DOCS, "brand", file));
for (const file of readdirSync(join(VENDOR, "fonts")))
  copyFileSync(join(VENDOR, "fonts", file), join(DOCS, "vendor", "fonts", file));

// 2) Build the static demo from the real app shell.
let demo = readFileSync(join(SRC, "index.html"), "utf8");

// Server routes -> paths relative to docs/demo/.
demo = demo.replace(/url\("\/fonts\//g, 'url("../vendor/fonts/');
demo = demo.replace(/,url\("\/fonts-local\/thmanyah-display\.(?:woff2|otf|ttf)"\) format\("(?:woff2|opentype|truetype)"\)/g, "");
demo = demo.replace(/,url\("\/fonts-local\/thmanyah-text\.(?:woff2|otf|ttf)"\) format\("(?:woff2|opentype|truetype)"\)/g, "");
demo = demo.replace('href="/brand/mark.svg"', 'href="../brand/mark.svg"');
demo = demo.replace(/src="\/brand\//g, 'src="../brand/');
demo = demo.replace('href="/brand.css"', 'href="../brand.css"');
demo = demo.replace('<script src="/brand-glass.js"></script>', '<script src="../brand-glass.js"></script>');
demo = demo.replace('<script src="/marked.js"></script>', '<script src="../vendor/marked.min.js"></script>');
demo = demo.replace('<script src="/render-core.js"></script>', '<script src="./render-core.js"></script>');
demo = demo.replace('<script src="/annotation-core.js"></script>', '<script src="./annotation-core.js"></script>');
demo = demo.replace('<script src="/highlight.js"></script>', '<script src="../vendor/highlight.min.js"></script>');
demo = demo.replace('MERMAID_SRC="/mermaid.js"', 'MERMAID_SRC="../vendor/mermaid.min.js"');
demo = demo.replace('DOCX_SRC="/html-docx.js",ZIP_SRC="/jszip.js"', 'DOCX_SRC="../vendor/html-docx.min.js",ZIP_SRC="../vendor/jszip.min.js"');
demo = demo.replace('KATEX_JS="/katex.js",KATEX_CSS="/katex.css"', 'KATEX_JS="../vendor/katex.min.js",KATEX_CSS="../vendor/katex.min.css"');
demo = demo.replace('<script src="/marked-footnote.js"></script>', '<script src="../vendor/marked-footnote.umd.js"></script>');

// Swap live reload for a GitHub link.
const live = '<span class="live" id="live" role="status" title="يتابع تغييرات الملف تلقائيًا" aria-label="الاتصال بالتحديث التلقائي غير متاح"><span class="dot"></span><span class="sr-only" id="livestatus">التحديث التلقائي غير متصل</span></span>';
const github = '<a class="iconbtn" href="https://github.com/Ajarallah/matn" target="_blank" rel="noopener" title="Matn on GitHub"><svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.4 6.7 19l1-5.8L3.5 9.2l5.9-.9z"/></svg><span class="lbl">GitHub</span></a>';
if (!demo.includes(live)) {
  console.error("build-docs: live indicator markup not found — aborting");
  process.exit(1);
}
demo = demo.replace(live, github);
demo = demo.replace('$("live").classList.remove("on");', "");

// Bundle the demo document.
const sample = readFileSync(join(ROOT, "scripts", "demo-sample.md"), "utf8");
const sampleBlock = '<script type="text/markdown" id="sample">' + sample + "</script>\n";
demo = demo.replace('<script src="../vendor/marked.min.js"></script>', () => sampleBlock + '<script src="../vendor/marked.min.js"></script>');

// Replace server-dependent boot with static boot.
const anchor = "applyS();\nvar params=new URLSearchParams";
const start = demo.indexOf(anchor);
const end = demo.indexOf("</script>", start);
if (start < 0 || end < 0) {
  console.error("build-docs: boot block not found — aborting");
  process.exit(1);
}
const boot = `applyS();
var SAMPLE=(document.getElementById("sample")||{}).textContent||"";
$("fname").textContent="نموذج · متن";document.title="متن · Matn";
renderSafely(SAMPLE);
`;
demo = demo.slice(0, start) + boot + "\n" + demo.slice(end);
writeFileSync(join(DEMO, "index.html"), demo, "utf8");

// Demo runtime assets.
copyFileSync(join(SRC, "render-core.cjs"), join(DEMO, "render-core.js"));
copyFileSync(join(SRC, "annotation-core.cjs"), join(DEMO, "annotation-core.js"));
for (const file of [
  "marked.min.js", "highlight.min.js", "mermaid.min.js", "html-docx.min.js",
  "jszip.min.js", "katex.min.js", "katex-auto.min.js", "katex.min.css",
  "marked-footnote.umd.js"
]) copyFileSync(join(VENDOR, file), join(DOCS, "vendor", file));
for (const file of readdirSync(join(VENDOR, "fonts")))
  copyFileSync(join(VENDOR, "fonts", file), join(DOCS, "vendor", "fonts", file));

const landing = readFileSync(join(DOCS, "index.html"), "utf8");
const checks = [
  [landing, 'href="./demo/"', "landing demo link"],
  [landing, 'id="language-toggle"', "landing language control"],
  [landing, 'id="theme-toggle"', "landing theme control"],
  [demo, "../vendor/marked.min.js", "demo marked path"],
  [demo, 'id="sample"', "demo sample"],
  [demo, "../brand/mark.svg", "demo brand path"],
  [demo, "safeRenderer", "safe renderer"]
];
const missing = checks.filter(([text, needle]) => !text.includes(needle)).map(([, , label]) => label);
const serverRefs = demo.match(/["']\/(api|marked|highlight|mermaid|fonts|brand)/g) || [];

console.log("build-docs: wrote landing + demo (" + demo.length + " demo bytes)");
console.log("build-docs: server refs left in demo:", serverRefs.length);
if (missing.length) {
  console.error("build-docs: MISSING", missing);
  process.exit(1);
}
console.log("build-docs: ok");
