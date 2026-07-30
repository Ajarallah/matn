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
]);

const MARKDOWN_EXTENSION_RE = new RegExp(`\\.(${MARKDOWN_EXTENSIONS.join("|")})$`, "i");

function isMarkdownPath(value) {
  return MARKDOWN_EXTENSION_RE.test(String(value || ""));
}

function withoutMarkdownExtension(value) {
  return String(value || "").replace(MARKDOWN_EXTENSION_RE, "");
}

module.exports = { MARKDOWN_EXTENSIONS, MARKDOWN_EXTENSION_RE, isMarkdownPath, withoutMarkdownExtension };
