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
  const items = (annotations || []).filter((item) => !item.sentAt).map((item) => ({ ...item, line: item.status === "orphan" ? 0 : lineOf(source, item.quote) }))
    .sort((a, b) => (a.line || Infinity) - (b.line || Infinity));
  const out = [`# Review: ${rel}`, "", `${items.length} ${items.length === 1 ? "note" : "notes"} on this file. Each quotes the text it is about; line numbers are for the file as it is now.`];
  items.forEach((item, index) => {
    const where = [item.line ? `line ${item.line}` : "", item.heading ? `under "${item.heading}"` : ""].filter(Boolean).join(", ");
    out.push("", `## ${index + 1}.${where ? " " + where.charAt(0).toUpperCase() + where.slice(1) : ""}`, "", ...String(item.quote).trim().split(/\r?\n/).map((line) => "> " + line.trim()), "");
    const suggestion = String(item.suggestion || "").trim();
    out.push(item.note && item.note.trim() ? item.note.trim() : suggestion ? "(no comment)" : "(highlighted, no comment)");
    if (suggestion) out.push("", "Suggested replacement:", "", ...suggestion.split(/\r?\n/).map((line) => "> " + line));
    if (item.status === "orphan") out.push("", "_The quoted text is no longer in the file._");
  });
  return out.join("\n") + "\n";
}

// CriticMarkup (criticmarkup.com): the notes written into the text itself, so any editor,
// Marked, or an agent reads each note where it belongs. A suggestion becomes a substitution
// {~~old~>new~~}, a note on a highlight {==text==}{>>note<<}. Quotes are rendered text; a quote
// the source does not contain verbatim (it spans formatting) is listed at the end instead.
function criticMarkup({ source, annotations }) {
  let text = String(source || "");
  const unplaced = [];
  const clean = (value) => String(value || "").replace(/\r?\n+/g, " ").replace(/(<<|>>|~~|==|\{|\})/g, (m) => "\u200b" + m).trim();
  const items = (annotations || []).filter((item) => item && item.quote && item.status !== "orphan")
    .map((item) => ({ item, at: text.indexOf(item.quote) }))
    .sort((a, b) => b.at - a.at);
  for (const { item, at } of items) {
    if (at < 0 || item.quote.includes("\n")) { unplaced.push(item); continue; }
    const note = clean(item.note), suggestion = clean(item.suggestion);
    const mark = suggestion ? `{~~${item.quote}~>${suggestion}~~}` : `{==${item.quote}==}`;
    text = text.slice(0, at) + mark + (note ? `{>>${note}<<}` : "") + text.slice(at + item.quote.length);
  }
  const orphans = (annotations || []).filter((item) => item && item.status === "orphan");
  const rest = unplaced.concat(orphans);
  if (rest.length) {
    text = text.replace(/\s*$/, "\n\n---\n\n");
    for (const item of rest) text += `- {==${clean(item.quote)}==}${item.note ? `{>>${clean(item.note)}<<}` : ""}\n`;
  }
  return text;
}

// Notes from several files in one hand-off: each file's review as reviewMarkdown writes it,
// one heading level down, under a line that says how many files and notes there are.
function workspaceReview(files) {
  const parts = (files || []).map((file) => ({ file, notes: (file.annotations || []).filter((item) => !item.sentAt) })).filter((part) => part.notes.length);
  const total = parts.reduce((sum, part) => sum + part.notes.length, 0);
  const out = [`# Review: ${parts.length} ${parts.length === 1 ? "file" : "files"}`, "", `${total} ${total === 1 ? "note" : "notes"}. Each file's notes quote the text they are about; line numbers are for the files as they are now.`];
  for (const { file } of parts) out.push("", reviewMarkdown(file).trim().replace(/^(#+) /gm, "#$1 ").replace(/^## Review: /, "## "));
  return out.join("\n") + "\n";
}

// Readwise's bulk CSV import: Highlight is required; Title, Author, URL, Note and Location are
// optional. Quotes are doubled, every field quoted, so Arabic commas and newlines survive.
function readwiseCsv(annotations, { author = "" } = {}) {
  const cell = (value) => '"' + String(value == null ? "" : value).replace(/"/g, '""') + '"';
  const rows = [["Highlight", "Title", "Author", "URL", "Note", "Location"].map(cell).join(",")];
  for (const item of annotations || []) {
    if (!item || !item.quote) continue;
    const title = String(item.path || "").replace(/^.*\//, "").replace(/\.[^.]+$/, "");
    rows.push([item.quote, title, author, "", [item.note, item.suggestion ? "Suggested: " + item.suggestion : ""].filter(Boolean).join("\n"), item.heading || ""].map(cell).join(","));
  }
  return rows.join("\r\n") + "\r\n";
}

return { createAnchor, reattach, reviewMarkdown, criticMarkup, workspaceReview, readwiseCsv };
});
