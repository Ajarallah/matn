# متن · Matn

**A calm, right-to-left Markdown reader for Arabic.**
Themes, embedded Arabic fonts, syntax highlighting, a table of contents, and live reload — running locally in your browser.

<div align="right"><a href="./README.ar.md"><b>العربية ←</b></a></div>

[![license: MIT](https://img.shields.io/badge/license-MIT-0f6d63.svg)](./LICENSE)
![node: >=18](https://img.shields.io/badge/node-%3E%3D18-0f6d63.svg)
![deps: none](https://img.shields.io/badge/runtime%20deps-none-0f6d63.svg)

![Matn — light theme](./assets/screenshot-light.png)

---

## Why

Terminals and many editors render Arabic Markdown poorly: no bidirectional
reordering, broken letter joining, mixed Arabic/Latin lines collapsing. **Matn**
renders your `.md` in the browser with proper `dir="auto"` per block, so Arabic
flows right-to-left while code and English stay left-to-right — and wraps it in a
reading experience built for long-form Arabic.

## Features

- 🪶 **True RTL** — per-block direction; Arabic right-aligned, code/English LTR.
- 🎨 **4 reading themes** — Light · Sepia · Dark · Night (OLED black). Follows your system by default.
- 🔤 **5 Arabic fonts, embedded** — System, Noto Naskh, Amiri, IBM Plex Sans Arabic, Tajawal. All OFL, bundled, **work offline**.
- 🔧 **Reading controls** — font, size, line-height, and text width (measure), all saved.
- 🌈 **Syntax highlighting** — theme-aware, powered by highlight.js.
- 🧭 **Table of contents** — auto-generated with scroll-spy; heading anchors.
- ♻️ **Live reload** — edit the file in any editor, the view updates on save.
- 🖱️ **Drag & drop** — drop any `.md` onto the window to read it.
- 🖨️ **Print / Export PDF** — one click, clean print layout.
- ⏱️ **Reading time & word count**, ✅ GFM task lists, tables, blockquotes.
- 📦 **Zero runtime dependencies** — pure Node + vendored assets.

## Screenshots

| Sepia + Amiri | Dark + syntax highlighting |
|---|---|
| ![sepia](./assets/screenshot-sepia.png) | ![dark](./assets/screenshot-dark.png) |

| Reading settings |
|---|
| ![settings](./assets/screenshot-settings.png) |

## Install

**Global (from GitHub):**
```bash
npm install -g Ajarallah/matn
matn README.md
```

**Run without installing:**
```bash
npx github:Ajarallah/matn README.md
```

**From source:**
```bash
git clone https://github.com/Ajarallah/matn.git
cd matn && npm link
matn README.md
```

> Requires Node.js ≥ 18. No other dependencies.

## Usage

```bash
matn <file.md>        # open a single file
matn ./docs           # browse a folder (sidebar file list)
matn                  # open the current directory
matn PLAN.md -p 5000  # custom port
```

Options: `-p, --port` · `--host` · `--no-open` · `-h, --help` · `-v, --version`.

Matn opens your browser automatically and reuses a running instance, so `matn a.md`
then `matn b.md` both land in the same window.

### In the browser

- Click **⚙** for theme, font, size, line-height, and width — all remembered.
- **Drag** any `.md` onto the window to open it.
- **🖨️** prints / exports a clean PDF.
- Keys: `+` / `−` size · `g` / `G` top / bottom · `Esc` close panel.

## Open `.md` on double-click (macOS, optional)

Make Matn the default reader for Markdown files:

```bash
brew install duti
duti -s $(osascript -e 'id of app "Matn"' 2>/dev/null || echo com.ajarallah.matn) net.daringfireball.markdown all
```

Or set it per file: **Get Info → Open with → Change All**. See [`scripts/`](./scripts) for
a ready Finder droplet you can build.

## How it works

Matn is a tiny local HTTP server (`~200` lines, no dependencies). It renders
Markdown with [marked](https://github.com/markedjs/marked), stamps `dir="auto"` on
every text block for correct bidi, highlights code with
[highlight.js](https://github.com/highlightjs/highlight.js), and pushes live-reload
events over Server-Sent Events. Fonts and libraries are vendored, so it runs fully
offline and never phones home.

## Credits & licenses

- Code: **MIT** — see [LICENSE](./LICENSE).
- Fonts: **SIL OFL 1.1** — Amiri, Noto Naskh Arabic, IBM Plex Sans Arabic, Tajawal.
- [marked](https://github.com/markedjs/marked) (MIT), [highlight.js](https://github.com/highlightjs/highlight.js) (BSD-3-Clause).

Full third-party notices in [NOTICE](./NOTICE).

## Contributing

Issues and PRs welcome. Roadmap ideas: Mermaid diagrams, presentation mode,
in-document search, more themes. See [CHANGELOG](./CHANGELOG.md).

---

Made by [Ali Aljarallah](https://github.com/Ajarallah). **متن** — the core text of a book.
