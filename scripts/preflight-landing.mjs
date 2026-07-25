#!/usr/bin/env node
// Mechanical pre-flight for the landing page. These are the anti-slop rules that
// can be checked by counting rather than by eye, so they stay enforced instead of
// drifting back in. Run:  node scripts/preflight-landing.mjs
import { readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(ROOT, "site", "landing.html"), "utf8");

// Only the parts a visitor actually reads: strip comments, <style> and <script>.
const visible = src
  .replace(/<!--[\s\S]*?-->/g, "")
  .replace(/<style[\s\S]*?<\/style>/gi, "")
  .replace(/<script[\s\S]*?<\/script>/gi, "");
const body = visible.slice(visible.indexOf("<body"));
const text = body.replace(/<[^>]*>/g, " ");

const fails = [];
const ck = (ok, label, detail = "") => {
  console.log(`${ok ? "  ok  " : "FAIL  "}${label}${detail ? "  " + detail : ""}`);
  if (!ok) fails.push(label);
};

// 9.G: zero em-dashes and zero en-dash separators in anything visible.
const emdash = (visible.match(/[—–]/g) || []).length;
ck(emdash === 0, "no em-dash or en-dash in visible copy", `found ${emdash}`);

// 9.F: the middle dot is rationed to one per line in metadata strips.
const dotty = body.split("\n")
  .map((l, i) => [i + 1, (l.match(/·/g) || []).length])
  .filter(([, n]) => n > 1);
ck(dotty.length === 0, "middle dot used at most once per line",
  dotty.length ? `lines ${dotty.map(([l, n]) => `${l}(${n})`).join(", ")}` : "");

// 4.7: eyebrow budget is ceil(sections / 3), and the hero kicker counts as one.
const sections = (body.match(/<section\b/g) || []).length + (/class="wrap hero"/.test(body) ? 1 : 0);
const eyebrows = (body.match(/class="(eyebrow|kicker)"/g) || []).length;
const budget = Math.ceil(sections / 3);
ck(eyebrows <= budget, "eyebrow count within budget",
  `${eyebrows} used, ${budget} allowed for ${sections} sections`);

// 4.7: the hero is one moment. Four text elements, no more.
const hero = body.slice(body.indexOf('class="wrap hero"'), body.indexOf("</header>"));
const heroEls = (hero.match(/class="(kicker|lede|actions)"|<h1>/g) || []).length;
const heroBanned = /class="(cmd|hint)"/.test(hero);
ck(heroEls <= 4 && !heroBanned, "hero holds at most four text elements",
  `${heroEls} found${heroBanned ? ", plus a banned command or tagline block" : ""}`);

// 4.7: hero subtext caps at 20 words, checked per language.
for (const lang of ["ar", "en"]) {
  const m = new RegExp(`<span data-${lang}>([^<]*)</span>`).exec(
    /<p class="lede">[\s\S]*?<\/p>/.exec(src)?.[0] || "");
  const words = m ? m[1].trim().split(/\s+/).length : 0;
  ck(words > 0 && words <= 20, `hero subtext (${lang}) is 20 words or fewer`, `${words} words`);
}

// 9.C: three identical cards side by side is the banned default.
const equalGrid = /grid-template-columns:\s*repeat\(auto-fit,\s*minmax\([^)]*\)\)/.test(src);
ck(!equalGrid, "no auto-fit equal-cell card row", equalGrid ? "found an auto-fit grid" : "");

// 4.5: one label per CTA intent, everywhere on the page.
const tryLabels = new Set(
  [...body.matchAll(/<a[^>]*href="\.\/try\/"[^>]*>([\s\S]*?)<\/a>/g)]
    .map((m) => (/<span data-ar>([^<]*)</.exec(m[1]) || [, m[1]])[1].trim()));
ck(tryLabels.size === 1, "one label for the try-it intent",
  `${tryLabels.size}: ${[...tryLabels].join(" / ")}`);

// 9.F: decorative status dots are banned; only real semantic state earns one.
const dots = (src.match(/class="dot"/g) || []).length;
ck(dots === 0, "no decorative status dots", dots ? `${dots} found` : "");

// 4.8: a landing page needs real images, not only typography.
const imgs = (body.match(/<img\b/g) || []).length;
ck(imgs >= 2, "at least two real images", `${imgs} found`);

// 9.F / 4.7: assorted tells that are pure string matches.
for (const [re, label] of [
  [/Scroll to explore|↓\s*scroll|>\s*Scroll\s*</i, "no scroll cues"],
  [/\bv\d+\.\d+\.\d+\b|Build \d{3,}/, "no version stamps on a marketing page"],
  [/BETA|INVITE-ONLY|EARLY ACCESS/, "no launch-status labels in the hero"],
  [/\b(00|01|02)\s*[\/·]\s*\w/, "no section-number eyebrows"],
  [/Quietly (in use|trusted)/i, "no \"quietly trusted by\" social proof"],
  [/Elevate|Seamless|Unleash|Next-Gen|Revolutioniz/i, "no filler marketing verbs"],
]) ck(!re.test(visible), label);

// 4.4: one corner-radius system. Every radius comes from a token.
const radii = [...src.matchAll(/border-radius:\s*([^;}]+)/g)].map((m) => m[1].trim())
  .filter((v) => !v.startsWith("var(") && !["50%", "999px", "inherit", "4.5px"].includes(v));
ck(radii.length === 0, "every corner radius comes from a token",
  radii.length ? `off-scale: ${[...new Set(radii)].join(", ")}` : "");

// 6.B / 6.E: reduced motion honoured, grain kept off scrolling containers.
ck(/@media \(prefers-reduced-motion:reduce\)/.test(src), "reduced motion honoured");
ck(/#grain\{position:fixed[^}]*pointer-events:none/.test(src), "grain is fixed and pointer-events:none");
ck(/@media \(prefers-reduced-transparency:reduce\)/.test(src), "reduced transparency honoured");

// 5.D: no scroll listeners.
ck(!/addEventListener\(\s*["']scroll["']/.test(src), "no scroll event listener");

console.log("");
if (fails.length) {
  console.error(`preflight-landing: ${fails.length} check(s) failed`);
  process.exit(1);
}
console.log("preflight-landing: ok");
