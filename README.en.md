# متن · Matn

**An Arabic Markdown reader with a Mac-first Liquid Glass interface.**
A library, outline, notes, and inspector around a local reading surface, fully offline.

**[▶ Try the live demo](https://ajarallah.github.io/matn/)**

**[العربية →](./README.md)**

[![license: MIT](https://img.shields.io/badge/license-MIT-0f6d63.svg)](./LICENSE)
[![release](https://img.shields.io/github/v/release/Ajarallah/matn?color=0f6d63&label=release)](https://github.com/Ajarallah/matn/releases)
![node: >=18](https://img.shields.io/badge/node-%3E%3D18-0f6d63.svg)
![runtime deps: none](https://img.shields.io/badge/runtime%20deps-none-0f6d63.svg)

![Matn — light theme](./assets/screenshot-light.png)

---

## Why

Terminals and many editors mangle Arabic Markdown: no bidirectional reordering,
broken letter-joining, mixed Arabic/Latin lines collapsing, and a heading that
merely starts with a Latin word flips the whole line to left-to-right. **Matn**
renders your `.md` in the browser as a genuine right-to-left document — Arabic
flows RTL while code and English read LTR inside it — wrapped in a reading
experience built for long-form Arabic.

## Features

**Reading**

- 🫧 **Real Liquid Glass structure** — a floating library sidebar, separate inspector, and refractive toolbar groups above an opaque content layer, with reduced-transparency and reduced-motion fallbacks.
- 🪶 **True RTL** — the document follows its *dominant* language, so an Arabic file stays right-to-left even when a heading or line starts with Latin. Latin runs still read left-to-right within the line.
- 🎨 **Four themes** — Light · Sepia · Dark · Night (OLED black); follows your system by default.
- 🔤 **Arabic fonts, embedded** — System, Noto Naskh, Amiri, IBM Plex Sans Arabic, Tajawal (all SIL OFL, bundled, **offline**). Optional Thmanyah Display + Text.
- 🔧 **Reading controls** — font, size, line-height, column width, and text alignment (start / justify); every choice is saved locally.
- 🌍 **Bilingual interface** — switch the whole UI between Arabic and English.
- ⌨️ **Shortcuts you can find** — press `?` for the full list, or open it from the settings panel.

**Content**

- 🌈 **Syntax highlighting** — theme-aware, via highlight.js.
- 🧮 **Math** — inline `$…$` and block `$$…$$` rendered with KaTeX, offline.
- 📊 **Mermaid diagrams** — rendered inline and theme-aware; hover to magnify.
- 💬 **GFM callouts** — `> [!NOTE]`, `[!TIP]`, `[!WARNING]`, … styled per type.
- 🔗 **Wikilinks** — `[[page]]` and `[[page|alias]]`, like Obsidian.
- ◇ **Document health** — a local report for missing links, images, and headings, without network checks or leaving the reading root.
- 📝 **Footnotes**, a **YAML frontmatter card**, task lists, tables, blockquotes.
- 🖼️ **Hover zoom** — magnify diagrams and images at the cursor.

**Navigation & files**

- 🧭 **Table of contents** — auto-generated, with scroll-spy and heading anchors.
- 🔤 **Outline filter** — on a long document, type part of a section name to reach it. Matched with Arabic normalisation, so hamzas and diacritics don't get in the way.
- 🗂️ **File tree** — open a folder to browse a nested, collapsible directory tree.
- 📖 **Book mode** — reads `SUMMARY.md` as ordered chapters with previous/next and overall progress, without building or modifying files.
- 🔎 **In-document search** — press `/` to find and jump between matches.
- ♻️ **Live reload** — edit in any editor; the view updates on save.
- 🐘 **Responsive large files** — documents over 2MB render in a Worker and load progressively without freezing the reader.
- 🖱️ **Drag & drop** any `.md` onto the window.

**Output**

- 📤 **Export** — PDF, standalone HTML, Word (`.docx`), EPUB 3 (RTL page progression), or raw Markdown.
- 🖨️ **Print** — a clean print layout.

**Foundations**

- 📦 **Zero runtime dependencies** — pure Node plus vendored assets, fully offline; never phones home.
- 🔒 **Contained** — binds to `127.0.0.1`, serves only from the folder you opened, escapes raw HTML, and blocks unsafe URL schemes.
- 📄 **Common Markdown formats** — opens `.md`, `.markdown`, `.mdown`, `.mkdn`, `.mkd`,
  `.mdwn`, `.mdtxt`, `.mdtext`, `.rmd`, and `.qmd`.

## Screenshots

| Sepia · Amiri | Dark · syntax + math |
|---|---|
| ![sepia](./assets/screenshot-sepia.png) | ![dark](./assets/screenshot-dark.png) |

| Reading settings |
|---|
| ![settings](./assets/screenshot-settings.png) |

## Install

```bash
npm install -g @ajarallah/matn
matn README.md
```

> Requires Node.js ≥ 18. Nothing else — no runtime dependencies, no build step, so
> installing takes about a second.

**Run without installing:**
```bash
npx @ajarallah/matn README.md
```

**From source (for development):**
```bash
git clone https://github.com/Ajarallah/matn.git
cd matn && npm link
```

> The bare `matn` name on npm belongs to an unrelated package, so this ships as
> `@ajarallah/matn`. The command is still `matn`.

**Uninstall:**
```bash
bash "$(npm root -g)/@ajarallah/matn/scripts/install-macos.sh" --uninstall   # macOS
npm rm -g @ajarallah/matn
```

## Usage

```bash
matn <file.md>        # open a single file
matn ./docs           # browse a folder (file-tree sidebar)
matn                  # open the current directory
command | matn -      # read Markdown from stdin in a temporary session
matn PLAN.md -p 5000  # custom port
```

Options: `-p, --port` · `--host` · `--no-open` · `--editor <executable>` · `--allow-file-actions` · `--stdin-name <name>` · `-h, --help` · `-v, --version`.

Matn opens your browser automatically and reuses a running instance, so `matn a.md`
then `matn b.md` both land in the same window.

### In the browser

- Click **⚙** for explained reading modes, language, theme, font, size, line-height, width, and alignment — all remembered.
- **Select text once** to highlight it, add a note, save it, or copy rich HTML that preserves RTL and structure alongside plain text and a source link.
- **Hover a document-map line** to preview its heading, click it to jump there, or open the list button for every heading.
- **Switch between rendered, source, and split views** with `</>`; the `¶` beside a heading opens its corresponding Markdown line.
- **Drag** any `.md` onto the window to open it.
- **Save ▾** exports PDF / HTML / Word / EPUB / Markdown; **🖨️** prints.
- Press **/** to search, **?** for the full shortcut list. Keys: `⌘K` library · `+` / `−` size · `g` / `G` top / bottom · `f` focus · `Esc` close the panel.

## Open `.md` on double-click

**macOS** — make Matn the default reader for Markdown, in one step:

```bash
bash "$(npm root -g)/@ajarallah/matn/scripts/install-macos.sh" --default
```

From a cloned repo: `bash scripts/install-macos.sh --default`.

This builds a small Finder app, declares all ten Markdown extensions, and claims
the Markdown type through LaunchServices — no Homebrew or `duti` needed. If that
fails it walks you through **Get Info → Open with → Change All** instead. To undo,
`--uninstall` moves the app to the Trash and hands `.md` back to your previous app.

**Linux** — `bash scripts/install-linux.sh --default` adds a `.desktop` entry and
makes Matn the handler for `text/markdown`.
**Windows** — `matn file.md` works from any shell; associate `.md` via
*Open with → Choose another app* pointing at `matn`.

## How it works

Matn is a small local HTTP server (`src/server.mjs`, no dependencies). It renders
Markdown with [marked](https://github.com/markedjs/marked), gives each text block
the document's dominant direction for correct bidi, highlights code with
[highlight.js](https://github.com/highlightjs/highlight.js), renders math with
[KaTeX](https://katex.org) and diagrams with [Mermaid](https://mermaid.js.org)
(both lazy-loaded), and pushes live-reload events over Server-Sent Events. Fonts
and libraries are vendored, so it runs fully offline and never phones home.

The testable logic lives in pure modules (`src/*-core.cjs`) that load in both Node and
the browser, so Arabic normalisation and the render pipeline exist once rather than
twice. See [ARCHITECTURE.md](./ARCHITECTURE.md).

## Security

Matn binds to `127.0.0.1` by default and serves Markdown plus referenced raster
images only from the file or folder you opened. Raw HTML in Markdown is escaped,
and unsafe link schemes such as `javascript:` are blocked. Avoid `--host 0.0.0.0`
unless you intentionally want other devices on your network to reach the reader.
See [SECURITY.md](./SECURITY.md).

## Credits & licenses

- Code: **MIT** — see [LICENSE](./LICENSE).
- Fonts: **SIL OFL 1.1** — Amiri, Noto Naskh Arabic, IBM Plex Sans Arabic, Tajawal.
- Libraries: [marked](https://github.com/markedjs/marked) (MIT),
  [highlight.js](https://github.com/highlightjs/highlight.js) (BSD-3-Clause),
  [KaTeX](https://katex.org) (MIT), [Mermaid](https://mermaid.js.org) (MIT),
  marked-footnote (MIT), html-docx-js (MIT), JSZip (MIT).

Full third-party notices in [NOTICE](./NOTICE).

## Contributing

Issues and PRs welcome — start with [CONTRIBUTING](./.github/CONTRIBUTING.md). It
names the commands CI runs and what usually gets turned down: a runtime dependency,
an editing feature, a network call, a wider file root. Design decisions and the
research behind them are in [plans/](./plans/README.md); changes in the
[CHANGELOG](./CHANGELOG.md).

---

Made by [Ali Aljarallah](https://github.com/Ajarallah). **متن** — the core text of a book.
