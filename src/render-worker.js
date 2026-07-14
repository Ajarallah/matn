"use strict";

importScripts("/marked.js", "/marked-footnote.js", "/render-core.js");

if (self.marked && marked.use) {
  try {
    marked.use({ extensions: [{
      name: "wikilink",
      level: "inline",
      start(source) { return source.indexOf("[["); },
      tokenizer(source) {
        const match = /^\[\[([^\]|\n]+)(?:\|([^\]\n]+))?\]\]/.exec(source);
        if (match) return { type: "wikilink", raw: match[0], target: match[1].trim(), text: (match[2] || match[1]).trim() };
      },
      renderer(token) {
        return `<a class="wikilink internal-link" href="#" data-wiki="${MatnCore.esc(token.target)}" title="${MatnCore.esc(token.target)}">${MatnCore.esc(token.text)}</a>`;
      },
    }] });
  } catch {}
  try { if (self.markedFootnote) marked.use(markedFootnote()); } catch {}
}

self.onmessage = (event) => {
  try {
    const markdown = String(event.data?.markdown || "");
    const frontmatter = MatnCore.parseFrontmatter(markdown);
    const direction = MatnCore.voteDir([frontmatter.body]);
    const words = (frontmatter.body.trim().match(/\S+/g) || []).length;
    const chunks = [];
    let rest = frontmatter.body;
    const max = 96 * 1024;
    while (rest.length > max) {
      let at = rest.lastIndexOf("\n\n", max);
      if (at < max / 2) at = rest.lastIndexOf("\n", max);
      if (at < max / 2) at = rest.lastIndexOf(" ", max);
      if (at < max / 2) at = max;
      chunks.push(rest.slice(0, at));
      rest = rest.slice(at).replace(/^\s+/, "");
    }
    if (rest) chunks.push(rest);
    for (let index = 0; index < chunks.length; index++) {
      const math = MatnCore.preprocess(chunks[index]);
      const html = MatnCore.restoreMath(marked.parse(math.src, { renderer: MatnCore.safeRenderer(marked) }), math.store);
      self.postMessage({ type: "chunk", html, index, total: chunks.length });
    }
    self.postMessage({ type: "done", ok: true, pairs: frontmatter.pairs, direction, words });
  } catch (error) {
    self.postMessage({ type: "done", ok: false, error: error?.message || "render failed" });
  }
};
