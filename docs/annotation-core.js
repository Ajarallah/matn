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

return { createAnchor, reattach };
});
