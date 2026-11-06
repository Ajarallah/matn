// Pure SUMMARY.md parser for read-only book navigation.
"use strict";

function decode(value) { try { return decodeURIComponent(value); } catch { return value; } }

function parseSummary(markdown) {
  const chapters = [];
  let inFence = false, part = "", sawSummary = false;
  for (const [index, original] of String(markdown || "").split(/\r?\n/).entries()) {
    if (/^[ \t]{0,3}(`{3,}|~{3,})/.test(original)) { inFence = !inFence; continue; }
    if (inFence) continue;
    // a part title is an h1 (the first one, "# Summary", names the file, not a part)
    const heading = /^#\s+(.+?)\s*#*\s*$/.exec(original);
    if (heading) { if (sawSummary) part = heading[1].trim(); sawSummary = true; continue; }
    // list items are numbered chapters; a bare link line is a prefix or suffix chapter
    const match = /^(\s*)[-+*]\s+\[([^\]\n]+)\]\((<[^>]+>|[^)\s]+)(?:\s+["'][^"']*["'])?\)\s*$/.exec(original)
      || /^()\[([^\]\n]+)\]\((<[^>]+>|[^)\s]+)(?:\s+["'][^"']*["'])?\)\s*$/.exec(original);
    if (!match) continue;
    const target = decode(match[3].replace(/^<|>$/g, "").trim());
    if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("//")) continue;
    const chapter = { title: match[2].trim(), target, depth: Math.floor(match[1].replace(/\t/g, "    ").length / 2), line: index + 1 };
    if (part) chapter.part = part;
    chapters.push(chapter);
  }
  return chapters;
}

module.exports = { parseSummary };
