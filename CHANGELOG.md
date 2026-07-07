# Changelog

All notable changes to Matn are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com).

## [1.1.1] — 2026-07-07

### Fixed
- **Wide tables no longer clip or collapse.** Tables now sit in a horizontally
  scrollable wrapper and — like code blocks and diagrams — expand beyond the
  reading measure to use the full pane width, so 4-column bilingual tables read
  cleanly instead of being cut off or squeezed into one-word-per-line columns.
- **Headings now match body width** — the reading measure is font-size-independent
  (px), so headings align with paragraphs instead of overhanging.
- Document-direction voting ignores tables and code, so Latin identifiers in a
  data table can't flip an Arabic document to LTR.

## [1.1.0] — 2026-07-07

### Added
- **Dominant-language direction** — the whole document flows RTL/LTR by the majority script (Arabic-leaning bias), so files that merely start with Latin no longer flip to LTR.
- **Bilingual UI** — Arabic/English interface toggle in settings (chrome direction, labels, find bar, sidebar).
- **Hover zoom lens** on Mermaid diagrams and images — magnifies at the cursor.
- **Export menu** — PDF (print), standalone HTML, Word (docx via html-docx-js), EPUB 3 (via JSZip, RTL page progression), and raw Markdown.
- **Consistent labeled toolbar** — one stroke-icon set with visible names (Open, Save, Print, Settings).
- **Thmanyah font support** — Display for headings + Text for body, loaded from a local, gitignored folder (its license forbids redistribution; see vendor/fonts-local/README.md).

## [0.1.2] — 2026-07-06

### Security
- Restrict the local file API to the file or directory root used to start Matn.
- Escape raw HTML in rendered Markdown and block unsafe link/image URL schemes.
- Serve referenced raster images only from within the active reading root.

### Fixed
- `matn` with no arguments now opens the current directory as documented.
- File watchers are closed when the HTTP server shuts down.

### Added
- Basic Node test coverage for file API root isolation.
- GitHub Actions CI for tests and package dry-run checks.
- Security policy for public GitHub publication.

## [1.0.0] — 2026-07-06

First stable release. Matn is now a full-featured RTL reader.

### Added
- **Mermaid diagrams** — fenced ` ```mermaid ` blocks render inline, theme-aware, lazy-loaded, sandboxed (`securityLevel: strict`).
- **GFM callouts** — `> [!NOTE|TIP|IMPORTANT|WARNING|CAUTION|…]` with per-type icon, colour and title.
- **Wikilinks** — `[[page]]` and `[[page|alias]]` render as styled references.
- **In-document search** — press `/` to search, `Enter`/`Shift+Enter` to move between hits; native find stays intact.
- **Browser tab favicon**; Linux installer (`scripts/install-linux.sh`) and a reproducible Pages build (`scripts/build-docs.mjs`).

### Fixed
- **Open files from any folder** — a target outside a running instance's containment root now spawns its own contained instance on the next free port (was: refused). Adds `/api/root`.
- Callout title/body split; progress bar via transform; favicon 404 silenced.

### Security
- Path-traversal containment (realpath + root check) on every file, folder and image request; images restricted to safe raster types under the opened root; raw HTML escaped; unsafe link schemes (`javascript:`) blocked. See [SECURITY.md](./SECURITY.md).

## [0.1.1] — 2026-07-06

Design-system refinement pass (grounded in Carbon tokens, shadcn palette, and
restraint/typography principles).

### Changed
- Rebuilt the theme palettes with consistent tinted neutrals per theme (warm paper, calibrated sepia, warm charcoal, true black) instead of mixed warm/cool grays.
- Lighter, more intentional type weights; a fixed modular type scale; `text-wrap: balance/pretty`, tabular figures for metadata, `ch`-based reading measure.
- Quieter chrome: ghost header buttons, subtler live indicator, refined settings popover with live font previews.
- Table of contents active state uses a small accent dot instead of a heavy side border.
- Added a subtle grain overlay, tinted shadows, focus-visible rings, press states, and `prefers-reduced-motion` support.

### Fixed
- Progress bar animates via `transform: scaleX` (GPU) instead of `width`.
- Removed em-dash-heavy UI copy.

## [0.1.0] — 2026-07-06

Initial release.

### Added
- RTL-first Markdown reader with per-block `dir="auto"` (Arabic RTL, code/English LTR).
- Four reading themes: Light, Sepia, Dark, Night — follows system preference by default.
- Five embedded Arabic fonts (OFL, offline): System, Noto Naskh, Amiri, IBM Plex Sans Arabic, Tajawal.
- Reading controls: font, size, line-height, text width — persisted in `localStorage`.
- Theme-aware syntax highlighting (highlight.js).
- Auto table of contents with scroll-spy; heading anchors.
- Live reload over SSE (single file and folder modes).
- Drag & drop a `.md` onto the window.
- Print / Export-PDF with a clean print layout.
- Reading time & word count; GFM task lists, tables, blockquotes.
- Copy-to-clipboard buttons on code blocks.
- CLI: `matn [file|dir]` with `--port`, `--host`, `--no-open`; auto-opens the browser and reuses a running instance.

### Roadmap
- Mermaid diagram rendering
- Presentation mode
- In-document search
- Additional themes and font pairings
