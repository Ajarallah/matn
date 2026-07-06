# Changelog

All notable changes to Matn are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com).

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
