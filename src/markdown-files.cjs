// Shared Markdown filename rules for the server, link resolver, and stdin.
// Keep plain text out: indexing every .txt file in a project would add noise.
"use strict";

const MARKDOWN_EXTENSIONS = Object.freeze([
  "md",
  "markdown",
  "mdown",
  "mkdn",
  "mkd",
  "mdwn",
  "mdtxt",
  "mdtext",
  "rmd",
  "qmd",
  "mdc",
  "mdx",
]);

const MARKDOWN_EXTENSION_RE = new RegExp(`\\.(${MARKDOWN_EXTENSIONS.join("|")})$`, "i");

function isMarkdownPath(value) {
  return MARKDOWN_EXTENSION_RE.test(String(value || ""));
}

function withoutMarkdownExtension(value) {
  return String(value || "").replace(MARKDOWN_EXTENSION_RE, "");
}

// Bytes on disk to text. Most files are UTF-8, but Arabic text saved by older Windows tools is
// UTF-16 (with a byte-order mark) or Windows-1256, and read as UTF-8 it turns to garbage.
// A byte-order mark is honoured; valid UTF-8 is UTF-8; anything else is read as Windows-1256.
function decodeText(bytes) {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes || []);
  if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) return buffer.subarray(3).toString("utf8");
  if (buffer[0] === 0xff && buffer[1] === 0xfe) return new TextDecoder("utf-16le").decode(buffer.subarray(2));
  if (buffer[0] === 0xfe && buffer[1] === 0xff) return new TextDecoder("utf-16be").decode(buffer.subarray(2));
  try { return new TextDecoder("utf-8", { fatal: true }).decode(buffer); }
  catch { return new TextDecoder("windows-1256").decode(buffer); }
}

module.exports = { MARKDOWN_EXTENSIONS, MARKDOWN_EXTENSION_RE, isMarkdownPath, withoutMarkdownExtension, decodeText };
