(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MatnAnnotations = api;
})(typeof self !== "undefined" ? self : this, function () {
"use strict";

function clampIndex(value, length) { const number = Number(value); return Number.isFinite(number) ? Math.max(0, Math.min(length, Math.floor(number))) : 0; }
function createAnchor(source, start, end, heading) {
  const text = String(source || ""), from = clampIndex(start, text.length), to = clampIndex(end, text.length);
  if (to <= from) return null;
  return {
    quote: text.slice(from, to).slice(0, 5000),
    prefix: text.slice(Math.max(0, from - 100), from),
    suffix: text.slice(to, Math.min(text.length, to + 100)),
    heading: typeof heading === "string" ? heading.slice(0, 240) : ""
  };
}
function commonPrefix(a, b) { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; }
function commonSuffix(a, b) { let i = 0; while (i < a.length && i < b.length && a[a.length - 1 - i] === b[b.length - 1 - i]) i++; return i; }
function reattach(source, anchor) {
  const text = String(source || ""), quote = String(anchor && anchor.quote || "");
  if (!quote) return { status: "orphan", start: -1, end: -1, score: 0 };
  let at = 0, best = null;
  while ((at = text.indexOf(quote, at)) >= 0) {
    const before = text.slice(Math.max(0, at - 100), at), after = text.slice(at + quote.length, at + quote.length + 100);
    const score = commonSuffix(String(anchor.prefix || ""), before) + commonPrefix(String(anchor.suffix || ""), after);
    if (!best || score > best.score) best = { status: "attached", start: at, end: at + quote.length, score };
    at += Math.max(1, quote.length);
  }
  return best || { status: "orphan", start: -1, end: -1, score: 0 };
}

// Notes written for an agent to act on: each one quotes the text it is about and says
// where that text is in the file now, so the agent can edit without guessing.
function lineOf(source, quote) {
  const text = String(source || ""), q = String(quote || "").trim();
  if (!q) return 0;
  let at = text.indexOf(q);
  if (at < 0) {
    // the quote is rendered text; the source may carry **, _, ` or links between the words
    const words = q.split(/\s+/).filter((w) => w.length > 1).slice(0, 4);
    for (let i = 0; at < 0 && i < words.length; i++) at = text.indexOf(words[i]);
  }
  return at < 0 ? 0 : text.slice(0, at).split("\n").length;
}
function reviewMarkdown({ rel, source, annotations }) {
  const items = (annotations || []).slice().map((item) => ({ ...item, line: item.status === "orphan" ? 0 : lineOf(source, item.quote) }))
    .sort((a, b) => (a.line || Infinity) - (b.line || Infinity));
  const out = [`# Review: ${rel}`, "", `${items.length} ${items.length === 1 ? "note" : "notes"} on this file. Each quotes the text it is about; line numbers are for the file as it is now.`];
  items.forEach((item, index) => {
    const where = [item.line ? `line ${item.line}` : "", item.heading ? `under "${item.heading}"` : ""].filter(Boolean).join(", ");
    out.push("", `## ${index + 1}.${where ? " " + where.charAt(0).toUpperCase() + where.slice(1) : ""}`, "", ...String(item.quote).trim().split(/\r?\n/).map((line) => "> " + line.trim()), "");
    out.push(item.note && item.note.trim() ? item.note.trim() : "(highlighted, no comment)");
    if (item.status === "orphan") out.push("", "_The quoted text is no longer in the file._");
  });
  return out.join("\n") + "\n";
}

return { createAnchor, reattach, reviewMarkdown };
});
