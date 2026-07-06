#!/usr/bin/env node
// Build the static GitHub Pages demo (docs/) from the app shell (src/index.html).
// The demo is client-only: no server, no file API — it renders a bundled sample
// and lets you open/drag your own .md. Run:  node scripts/build-docs.mjs
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(ROOT, "src", "index.html"), "utf8");
let s = src;

// 1) rewrite server routes -> relative vendored files
s = s.replace(/url\("\/fonts\//g, 'url("./vendor/fonts/');
s = s.replace('<script src="/marked.js"></script>', '<script src="./vendor/marked.min.js"></script>');
s = s.replace('<script src="/highlight.js"></script>', '<script src="./vendor/highlight.min.js"></script>');
s = s.replace('MERMAID_SRC="/mermaid.js"', 'MERMAID_SRC="./vendor/mermaid.min.js"');
s = s.replace('DOCX_SRC="/html-docx.js",ZIP_SRC="/jszip.js"', 'DOCX_SRC="./vendor/html-docx.min.js",ZIP_SRC="./vendor/jszip.min.js"');

// 2) header: swap the live-reload indicator for an open-file button + a GitHub link
const live = '<span class="live" id="live" title="تحديث حيّ"><span class="dot"></span><span data-i18n="live">حيّ</span></span>';
const openctrl = '<a class="iconbtn" href="https://github.com/Ajarallah/matn" target="_blank" rel="noopener" title="Matn on GitHub"><svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.4 6.7 19l1-5.8L3.5 9.2l5.9-.9z"/></svg><span class="lbl">GitHub</span></a>';
if (!s.includes(live)) { console.error("build-docs: live indicator markup not found — aborting"); process.exit(1); }
s = s.replace(live, openctrl);

// 3) the drop handler references #live (gone in the demo)
s = s.replace('$("live").classList.remove("on");', "");

// 4) bundled sample (non-executed markdown), inserted before marked loads
const SAMPLE = readFileSync(join(ROOT, "scripts", "demo-sample.md"), "utf8");
const sampleBlock = '<script type="text/markdown" id="sample">\n' + SAMPLE + '\n</script>\n';
s = s.replace('<script src="./vendor/marked.min.js"></script>', sampleBlock + '<script src="./vendor/marked.min.js"></script>');

// 5) replace the server-dependent boot block with a static boot
const anchor = "applyS();\nvar params=new URLSearchParams";
const i = s.indexOf(anchor);
const j = s.indexOf("</script>", i);
if (i < 0 || j < 0) { console.error("build-docs: boot block not found — aborting"); process.exit(1); }
const boot = `applyS();
var SAMPLE=(document.getElementById("sample")||{}).textContent||"";
$("fname").textContent="نموذج · متن";document.title="متن · Matn";
render(SAMPLE);
`; // file-open is handled by the app's own #fileinput listener
s = s.slice(0, i) + boot + "\n" + s.slice(j);

// 6) write docs/index.html + copy vendored assets
const DOCS = join(ROOT, "docs");
mkdirSync(join(DOCS, "vendor", "fonts"), { recursive: true });
writeFileSync(join(DOCS, "index.html"), s, "utf8");
copyFileSync(join(ROOT, "vendor", "marked.min.js"), join(DOCS, "vendor", "marked.min.js"));
copyFileSync(join(ROOT, "vendor", "highlight.min.js"), join(DOCS, "vendor", "highlight.min.js"));
copyFileSync(join(ROOT, "vendor", "mermaid.min.js"), join(DOCS, "vendor", "mermaid.min.js"));
copyFileSync(join(ROOT, "vendor", "html-docx.min.js"), join(DOCS, "vendor", "html-docx.min.js"));
copyFileSync(join(ROOT, "vendor", "jszip.min.js"), join(DOCS, "vendor", "jszip.min.js"));
for (const f of readdirSync(join(ROOT, "vendor", "fonts")))
  copyFileSync(join(ROOT, "vendor", "fonts", f), join(DOCS, "vendor", "fonts", f));

const checks = ["./vendor/marked.min.js", "./vendor/mermaid.min.js", "safeRenderer", "id=\"sample\""];
const missing = checks.filter((c) => !s.includes(c));
console.log("build-docs: wrote docs/index.html (" + s.length + " bytes)");
console.log("build-docs: server refs left:", (s.match(/["']\/(api|marked|highlight|mermaid|fonts)/g) || []).length);
if (missing.length) { console.error("build-docs: MISSING", missing); process.exit(1); }
console.log("build-docs: ok");
