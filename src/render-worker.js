"use strict";

importScripts("/marked.js", "/marked-footnote.js", "/render-core.js");

if (self.marked && marked.use) {
  try {
    marked.use({ extensions: MatnCore.obsidianExtensions() });
  } catch {}
  try { if (self.markedFootnote) marked.use(markedFootnote({ description: new URL(self.location.href).searchParams.get("footnotes") || "Footnotes" })); } catch {}
}

self.onmessage = (event) => {
  try {
    const markdown = String(event.data?.markdown || "");
    const frontmatter = MatnCore.parseFrontmatter(markdown);
    // front matter `dir`/`lang` wins, as in the ordinary render path
    const direction = MatnCore.frontmatterDir(frontmatter.pairs) || MatnCore.voteDir([frontmatter.body]);
    const words = (frontmatter.body.trim().match(/\S+/g) || []).length;
    const chunks = MatnCore.renderChunks(frontmatter.body, 64 * 1024);
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
