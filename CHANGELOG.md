# Changelog

All notable changes to Matn are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com).

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
