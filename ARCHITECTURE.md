# Architecture

Matn is a local HTTP server plus a single-page reader. There is no build step, no
bundler, and no runtime dependency — `npm i -g @ajarallah/matn` fetches Node code
and nothing else. Every constraint below follows from that one decision.

```
matn README.md
   │
   ├── bin/matn.mjs ──── parses argv, finds a free port, reuses a running instance
   │                     if it can serve the target, opens the browser
   │
   └── src/server.mjs ── HTTP + JSON API + SSE, rooted at one directory
          │
          ├── serves src/index.html (the whole reader)
          ├── serves vendor/* (fonts, marked, highlight.js, KaTeX, Mermaid)
          └── serves src/*-core.cjs to the page, which also require() them in Node
```

## The containment root

The server picks one root when it starts: the directory you opened, or the parent
of the file you opened. Every path that reaches the filesystem goes through
`withinRoot`, which resolves symlinks with `realpathSync` before comparing. There
is no route that takes a path and skips it.

That is the whole security model, and it is why `--host 0.0.0.0` carries a warning
rather than a config flag. Details in [SECURITY.md](./SECURITY.md).

## Pure cores

The logic that is worth testing does not touch the DOM, the filesystem, or the
network. It lives in UMD modules that `require()` in Node and attach to `window`
in the page, so one implementation serves the server, the reader, and the tests.

| Module | Owns | Used by |
|---|---|---|
| `render-core.cjs` | escaping, safe hrefs, math extraction, heading slugs, direction voting, frontmatter | page, worker, server (via link-core) |
| `search-core.cjs` | Arabic normalisation, record building, ranking | server API, outline filter |
| `link-core.cjs` | wikilinks, relative links, headings, backlinks | server API |
| `book-core.cjs` | `SUMMARY.md` parsing | server API |
| `annotation-core.cjs` | quote anchoring and re-attachment | page, server tests |
| `markdown-files.cjs` | which extensions count as Markdown | everything |

Arabic normalisation being one module rather than two is the reason the outline
filter and the library search agree on whether `الاعدادات` matches `الإعدادات`.
Two implementations would have drifted.

`src/index.html` holds the CSS and the reader's own code. It is large, and that is
the price of no build step: splitting it means either a bundler or more routes to
keep in step with the static demo. What it does *not* hold is anything testable —
the client delegates to the cores rather than reimplementing them.

## Rendering

Markdown never becomes trusted HTML. `safeRenderer` escapes raw HTML rather than
sanitising it, and `safeHref` allows only `http`, `https`, `mailto`, `tel`,
relative paths, fragments, and base64 image data URLs. Everything else renders as
text. That is a whitelist, so a novel injection vector fails closed.

Direction is decided per document, not per line. `voteDir` counts Arabic against
Latin across the block elements, and `stampDir` gives every flow block that
direction — so an Arabic file stays right-to-left even when a heading opens with
an English word, which is the single most common complaint about every other
reader. A block flips only when it is decisively the other script.

Documents over 2MB render in a Worker in ~96KB chunks so the page never freezes.
Everything below that renders synchronously; the split exists because it was
measured, not because it seemed prudent.

## Reader state

State lives outside the workspace, in the platform's application-data directory —
never in the folder you opened. Matn does not write to your Markdown. Highlights
and notes are anchored to quoted text with a prefix and suffix, so editing around
them keeps them attached and editing through them marks them orphaned.

Writes go through `PUT /api/state` and require a per-process session token plus a
same-origin check. Every write replaces the file atomically through a temp file
and a rename, so an interrupted write cannot truncate state.

## Live reload

`fs.watch` on the directories in play, broadcast over SSE. On reload the reader
re-renders but carries the collapsed sections and the exact scroll position
across, because the common case is an agent or an editor writing to the file
while you are reading it.

## Tests

`npm test` covers the server and the cores in Node with no browser.
`npm run test:e2e` drives the real reader in Chromium: selection, navigation,
folding, direction, target sizes, the mobile drawer, and live reload. Anything
with a branch, a loop, or a security boundary leaves one behind.
