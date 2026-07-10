// Workspace link resolution and backlink extraction. Kept pure so the server
// can index links without loading a DOM or modifying Markdown files.
"use strict";

const SearchCore = require("./search-core.cjs");
const RenderCore = require("./render-core.cjs");
const MD_EXT = /\.(md|markdown|mdown|mkd)$/i;

function withoutExtension(value) { return String(value || "").replace(MD_EXT, ""); }
function normalizePath(value) {
  const parts = String(value || "").replace(/\\/g, "/").split("/");
  const out = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") out.pop(); else out.push(part);
  }
  return out.join("/");
}
function dirname(rel) { const at = rel.lastIndexOf("/"); return at < 0 ? "" : rel.slice(0, at); }
function decode(value) { try { return decodeURIComponent(value); } catch { return value; } }
function splitTarget(raw) {
  let value = decode(String(raw || "").trim()).replace(/^<|>$/g, "");
  const query = value.indexOf("?"); if (query >= 0) value = value.slice(0, query) + value.slice(value.indexOf("#", query) >= 0 ? value.indexOf("#", query) : value.length);
  const hash = value.indexOf("#");
  return { file: (hash < 0 ? value : value.slice(0, hash)).trim(), heading: (hash < 0 ? "" : value.slice(hash + 1)).trim() };
}
function isExternal(target) { return /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("//"); }
function headings(content) {
  const found = []; let fence = null;
  for (const line of String(content || "").split(/\r?\n/)) {
    const marker = /^[ \t]{0,3}(`{3,}|~{3,})/.exec(line);
    if (marker) { if (!fence) fence = marker[1][0]; else if (marker[1][0] === fence) fence = null; continue; }
    if (fence) continue;
    const match = /^[ \t]{0,3}(#{1,3})[ \t]+(.+?)[ \t]*#*[ \t]*$/.exec(line);
    if (!match) continue;
    const text = match[2].trim();
    found.push({ level: match[1].length, text, id: RenderCore.slug(text, found.length) });
  }
  return found;
}
function headingFor(record, requested) {
  if (!requested) return null;
  const wanted = SearchCore.normalizeSearch(requested.replace(/^#/, "").replace(/-/g, " "));
  const list = headings(record.content);
  return list.find((heading) => heading.id === requested || SearchCore.normalizeSearch(heading.text) === wanted) || null;
}
function resolve(records, fromPath, rawTarget) {
  const target = splitTarget(rawTarget);
  if (isExternal(target.file)) return null;
  const from = records.find((record) => record.path === fromPath) || null;
  if (!target.file) {
    if (!from) return null;
    return { path: from.path, rel: from.rel, title: from.title, heading: headingFor(from, target.heading) };
  }
  const normalizedTarget = normalizePath(target.file.replace(/^\/+/, ""));
  const relativeTarget = from ? normalizePath((dirname(from.rel) ? dirname(from.rel) + "/" : "") + target.file) : normalizedTarget;
  const targetNoExt = withoutExtension(normalizedTarget).toLowerCase();
  const relativeNoExt = withoutExtension(relativeTarget).toLowerCase();
  const targetName = targetNoExt.split("/").pop();
  const targetNorm = SearchCore.normalizeSearch(withoutExtension(target.file));
  let best = null;
  for (const record of records) {
    const relNoExt = withoutExtension(record.rel).toLowerCase();
    const name = relNoExt.split("/").pop();
    let score = 0;
    if (relNoExt === relativeNoExt) score = 500;
    else if (relNoExt === targetNoExt) score = 450;
    else if (name === targetName) score = 300;
    if (record.titleNorm === targetNorm) score = Math.max(score, 260);
    if ((record.aliases || []).some((alias) => SearchCore.normalizeSearch(alias) === targetNorm)) score = Math.max(score, 250);
    if (!score || (best && best.score >= score)) continue;
    best = { score, record };
  }
  if (!best) return null;
  return { path: best.record.path, rel: best.record.rel, title: best.record.title, heading: headingFor(best.record, target.heading) };
}
function maskFenced(lines) {
  let fence = null;
  return lines.map((line) => {
    const marker = /^[ \t]{0,3}(`{3,}|~{3,})/.exec(line);
    if (marker) { if (!fence) fence = marker[1][0]; else if (marker[1][0] === fence) fence = null; return ""; }
    return fence ? "" : line.replace(/`[^`\n]*`/g, "");
  });
}
function outgoing(record) {
  const original = String(record.content || "").split(/\r?\n/);
  const visible = maskFenced(original);
  const links = [];
  for (let index = 0; index < visible.length; index++) {
    const line = visible[index];
    let match;
    const wiki = /\[\[([^\]|\n]+)(?:\|([^\]\n]+))?\]\]/g;
    while ((match = wiki.exec(line))) links.push({ target: match[1].trim(), text: (match[2] || match[1]).trim(), line: index + 1, context: original[index].trim().slice(0, 280), kind: "wiki" });
    const markdown = /(^|[^!])\[([^\]\n]+)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
    while ((match = markdown.exec(line))) {
      const target = match[3].trim();
      if (!isExternal(target) && !/^data:/i.test(target)) links.push({ target, text: match[2].trim(), line: index + 1, context: original[index].trim().slice(0, 280), kind: "markdown" });
    }
  }
  return links;
}
function context(records, path) {
  const current = records.find((record) => record.path === path);
  if (!current) return { outgoing: [], backlinks: [] };
  const out = outgoing(current).map((link) => ({ ...link, resolved: resolve(records, current.path, link.target) })).filter((link) => link.resolved);
  const backlinks = [];
  for (const record of records) {
    if (record.path === current.path) continue;
    for (const link of outgoing(record)) {
      const resolved = resolve(records, record.path, link.target);
      if (resolved && resolved.path === current.path) backlinks.push({ path: record.path, rel: record.rel, title: record.title, line: link.line, context: link.context, heading: resolved.heading });
    }
  }
  return { outgoing: out, backlinks };
}

module.exports = { splitTarget, headings, resolve, outgoing, context };
