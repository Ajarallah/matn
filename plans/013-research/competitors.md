# Markdown reading and viewing tools: competitive map (November 2026)

Compiled 2026-11-05 for Matn. Star counts come from the GitHub API on that date. Items marked **(unverified)** come from memory or secondary sources and were not re-checked against a primary page.

Legend: **Platform** · **Price/License** · **Traction** · **Standouts** · **Complaints**

---

## A. Dedicated readers and previewers (desktop)

### Marked 2 / Marked 3 (Brett Terpstra)
- **Platform:** macOS. **Price:** Marked 2 costs $14.99 once. Marked 3 (May 2026) is $2.99/mo intro ($4.99 list) or a permanent unlock. "Marked Pro" on the Mac App Store is Marked 3 without the subscription. Marked QL (Quick Look) is a separate $4.99.
- **Traction:** Around since 2011 and a staple of the Mac power-user crowd. 3.0.25 shipped in June 2026.
- **Standouts:**
  - **Preview companion for any editor.** It watches the file and updates on every save. Custom pre-processors and processors let it handle any syntax. Supports MultiMarkdown, CriticMarkup, Fountain, Scrivener, and (in Marked 3) RTF, PDF import with OCR, Bike/OPML outlines rendered as Mermaid mind maps. https://marked2app.com/ , https://brettterpstra.com/2026/06/01/marked-3-updates/
  - **Proofing.** Word repetition and density highlighting, overused words, custom keywords with wildcards (the "keyword drift" tooling), readability stats (Fog, Flesch-Kincaid), and link validation. https://marked2app.com/
  - **Reading Mode (Marked 3, Aug 2026). This is the closest competitor to Matn's annotations.** It saves a reading position per document and offers "Resume" or "Start from Here" on return. j/k moves block by block, and a focus mode dims everything except the current block. `h` highlights, with a signature for CriticMarkup attribution, and notes show in a Comments sidebar. Highlights export to MD/HTML/text/CSV (Readwise-compatible)/JSON, and JSON import merges by stable ID. Highlights can be injected into the doc as CriticMarkup, and they print to PDF. TextBundle carries a `highlights.json`. https://brettterpstra.com/2026/08/21/new-in-marked-3-reading-mode/
  - **Speed Read (RSVP)**, Quick Open (⇧⌘O), DOCX/EPUB export with Word styles, and `~dark`/`@2x` image variants. https://brettterpstra.com/2026/06/01/marked-3-updates/
- **Complaints:** Pushback on the subscription. The author himself says subscription revenue isn't enough and may move to yearly paid upgrades. The App Store build lags behind the Paddle build. macOS only.

### MacMD Viewer
- **Platform:** macOS 14+ (SwiftUI). **Price:** $19.99 once, also on Setapp and Homebrew. **Traction:** 4.4/5 on Trustpilot (17 reviews). 11 releases between Jul and Oct 2026.
- **Standouts:** Read-only by design, so it "never writes to your file". It **auto-opens files that Claude Code, Cursor, or Windsurf write or edit** (via a hook) and live-reloads them. Bundles a Quick Look extension with 12 themes, renders Mermaid, has an outline sidebar and optional tabs, and exports PDF with diagrams intact. https://macmdviewer.com/blog/best-markdown-viewer-mac
- **Complaints:** Paid, license-key activation, no editing, macOS only. Most claims are vendor-authored.

### Skim.md
- **Platform:** browser extension (Chrome, Firefox, Edge, Arc, and others) plus an online reader at skim.md/viewer. **License:** MIT, free. **Traction:** 15 stars.
- **Standouts:** **"Copy for AI"** (turns the rendered page back into Markdown), Hebrew/English bidi, TOC with scrollspy, live reload, offline KaTeX, frontmatter header card, zen mode, vim keys with block-by-block Tab navigation, standalone offline HTML export, encoding detection (UTF-16, legacy Windows), a large-file guard, and embeddable quizzes in HTML comments. https://github.com/skim-md/skim
- **Complaints:** Needs the "Allow access to file URLs" switch. Very small user base.

### mo (k1LoW)
- **Platform:** CLI that opens a local server in the browser (Go). **License:** MIT. **Traction:** 1.1k stars.
- **Standouts:** `mo file.md`, directories, or stdin. **Named groups** (`--target`) each get their own URL and sidebar. Glob/directory watch picks up new files. Full-text search across files, sessions that survive server restarts, fullscreen zoom for Mermaid and images, copy as MD/Text/HTML, MDX, GitHub alerts, `--json` for scripting. https://github.com/k1LoW/mo
- **Complaints:** Browser tab rather than an app. Live reload works only for files opened from the CLI.

### Marky
- **Platform:** macOS (Tauri). Show HN, April 2026. **Price:** free.
- **Standouts:** Built to read and track the `.md` files that agents produce. `marky FILE` CLI, folder open. Agent integration and a git-diff reviewer are on the roadmap. https://news.ycombinator.com/item?id=47795468
- **Complaints from that HN thread, useful as market signals:** "native" means a webview. Users asked for live updates, git integration that shows the changed parts, and better printing. One said VS Code's preview scrolls poorly, another that TUI viewers aren't friendly for reading. Obsidian vaults were called limiting for files outside the vault, with no quick-open CLI.

### Other new Mac/Win/Linux viewers (2026)
These are listed by the MacMD roundup and Show HN. All have Mermaid, most have Quick Look. https://macmdviewer.com/blog/best-markdown-viewer-mac , https://news.ycombinator.com/show
- **MDV** has an `mdv` CLI and a file watcher. **Imark** (MIT) offers **optional plan review for Claude Code**. **Readdown** (free, source-available) has tabs and PDF export. **Markdown Preview** (MIT) ships an `mdp` CLI and offline math. **QuickMD** (MIT) has click-to-enlarge Mermaid and GitHub alerts. **Telescopo** ($49.99) has a built-in AI assistant, ZenUML, and 200+ templates. **MarkViewer** shows a **"diff banner for on-disk changes"**. **markview (paulhkang94)** pairs Quick Look with an **MCP server for Claude Code**. Also Glance (free, App Store), MDViewer, Markdown Lens, ReadMD.
- **Windows/Linux:** Mdview Desktop (Show HN, Nov 2026), ƜackDown (native Win64), Peekdown (Mockitup, an 800 KB native Windows exe, 6 stars), Neilooo/md-reader (Tauri, 215 stars, full-text search, PDF via Edge), and a native GNOME viewer with Mermaid. **leaf** is a terminal previewer that also runs on Termux.

### SDocs / SmallDocs (sdocs.dev)
- **Platform:** web plus `sdoc` CLI. Show HN, 2026.
- **Standouts:** **Share links that carry the whole document in the URL fragment** (compressed base64), so no server sees it. Optional encrypted short links keep the key in the fragment. Styling travels with the doc as frontmatter. `sdoc share file.md` copies the link. https://hn.svelte.dev/item/47777633
- **Complaints:** HN noted that the page's JS can still read the fragment, so privacy depends on trusting the code.

---

## B. Editors that people use as readers

### Typora
- **Platform:** macOS, Windows, Linux. **Price:** $14.99 for 3 devices, with a 15-day trial. Latest is 1.13 (Mar 2026: MathJax 4, Mermaid 11.12, telemetry off by default).
- **Standouts:** **Seamless live preview.** There's no preview pane or mode switch, and syntax symbols hide while you write. File tree and outline, focus and typewriter modes, CSS themes, export to PDF with bookmarks, docx, LaTeX, and EPUB, table resizing by drag, image drag-in with relative paths. https://typora.io/ , https://alternativeto.net/news/2026/3/typora-1-13-brings-mathjax-4-mermaid-11-12-improved-search-performance-and-ui-updates
- **Complaints:** Reported slowdowns on large files (low-quality source claims a ~2 MB soft limit). Lingering resentment since it went paid in 2021 **(unverified)**. Its RTL support is basic **(unverified)**. https://kitemetric.com/blogs/boost-typora-s-file-size-limit-a-how-to-guide

### Obsidian (incl. 1.14)
- **Platform:** macOS, Windows, Linux, iOS, Android. **Price:** free; Sync $4/mo, Publish $8/mo. **Traction:** the dominant local-Markdown notes app.
- **Standouts:**
  - **1.14.2 (Sep 15 2026): "Open file from outside the vault…"** (desktop). Obsidian now shows in the OS "Open with" menu and can be the default `.md` app. https://obsidian.md/changelog/2026-09-15-desktop-v1.14.2/
  - **1.14.4+: native Quick Look previews on macOS.** https://community.obsidian.md/plugins/quickcss
  - 1.14 also brings a Bases kanban view and highlight colors. https://alternativeto.net/news/2026/10/obsidian-1-14-adds-external-markdown-file-opening-kanban-view-highlight-colors-and-more/
  - Classic standouts: hover **page preview** of links, `![[embeds]]` for notes, headings, blocks, and images, **graph view**, backlinks and unlinked mentions, block references `^id`, callouts, Bases (database views over frontmatter), canvas, and a plugin ecosystem. https://help.obsidian.md/Plugins/Page+preview , https://help.obsidian.md/Linking+notes+and+files/Embed+files , https://help.obsidian.md/Plugins/Graph+view
  - **Native auto-RTL per line since 1.6.** https://forum.obsidian.md/t/disable-the-new-auto-rtl-feature/83327
- **Complaints:** Vault-centric. Clicking an external `.md` link still hands off to the OS default app. https://forum.obsidian.md/t/open-external-markdown-file-links-inside-obsidian-instead-of-the-system-default-app/118341 . Quick Look hangs Finder keyboard focus on macOS 27 and shows plain text on some Intel Macs. https://forum.obsidian.md/t/obsidians-quick-look-on-macos-27-no-keystroke-possible-after-quick-looking-a-markdown-file/119162 . Electron. The auto-RTL broke some layouts.

### iA Writer
- **Platform:** macOS, Windows, iOS, Android. **Price:** one-time per platform (about $29.99 on Windows **(unverified)**), with a 7-day trial. **Version 8 (Jun 2026)** brings Liquid Glass and merges search with the outline. https://alternativeto.net/news/2026/6/ia-writer-8-merges-search-and-outline-with-new-liquid-glass-design/
- **Standouts:** **Authorship** marks typed, pasted, and AI-generated text in distinct colors (AI dimmed, other humans underlined), with live author color menus. Focus Mode on the current sentence or paragraph. Syntax highlighting by part of speech. On-device Style Check for clichés and filler. Preview templates. https://ia.net/writer , https://ia.net/writer/support/editor/authorship
- **Complaints:** Expensive across platforms. Windows lags behind macOS on features. Opinionated, with few settings.

### MarkEdit
- **Platform:** macOS. **License:** free, MIT. **Traction:** 5.9k stars (preview extension: 275).
- **Standouts:** "TextEdit for Markdown". Native, fast, and tiny (CodeMirror 6). Its extension API powers MarkEdit-preview, which offers edit, side-by-side, preview, and **"syntax-hidden"** modes cycled with ⇧⌘V, plus sync scroll and inline math/Mermaid rendering. https://github.com/MarkEdit-app/MarkEdit , https://github.com/MarkEdit-app/MarkEdit-preview
- **Complaints:** Preview isn't built in. Local images need a folder-access grant.

### Zettlr
- **Platform:** macOS, Windows, Linux (Electron). **License:** GPL-3, free. **Traction:** 13.9k stars. 4.0 shipped Dec 2025 and 4.7 by Aug 2026.
- **Standouts:** Academic workbench with Zotero/CSL citations (parser rewritten in 4.0), Pandoc export, built-in PDF and image viewer next to notes, rewritten table editor, collapsible YAML and Pandoc divs, Zettelkasten IDs and links. https://zettlr.com/post/zettlr-400-released
- **Complaints:** The visual editor dropped grid tables in 4.0. Electron weight. Steep learning curve.

### MacDown 3000
- **Platform:** macOS 11+. **License:** MIT, free. **Traction:** 506 stars. 3000.0.8 in 2026.
- **Standouts:** Revives MacDown and Mou as a split editor with live preview (Hoedown, Prism, TeX math, Jekyll frontmatter). Adds **folder workspace via `macdown .`** and the `[-]` partial task state. https://github.com/schuyler/macdown3000
- **Complaints:** Old Hoedown engine, no Mermaid upstream (a fork adds it).

### Bear
- **Platform:** macOS, iOS. **Price:** free, Pro subscription. **Version:** 2.9 (Jul 2026).
- **Standouts:** Polished native typography, nested tags, Workspaces (tag-focused, 2.9), and **BearCLI, a Claude Connector, and an MCP server (2.8, Apr 2026)**. https://releasebot.io/updates/bear/bear , https://alternativeto.net/news/2026/3/markdown-note-taking-app-bear-2-7-revamps-tagcons-and-adds-tag-management-option-on-macos
- **Complaints:** Notes live in a database, not plain files. Apple-only. Can't open arbitrary `.md` files as a reader.

### Inkdrop
- **Platform:** all desktop and mobile. **Price:** subscription (~$5/mo **(unverified)**).
- **Standouts:** v6 (Aug 2026) rebuilt on CodeMirror 6, with automatic merge of concurrent edits, a built-in MCP server, slash commands, and **strict CommonMark/GFM with no proprietary extensions**. https://forum.inkdrop.app/t/whats-new-in-v6/5570 , https://alternativeto.net/news/2026/8/inkdrop-v6-rebuilds-its-editor-preview-and-storage-engine/
- **Complaints:** Subscription. Database storage. v6 broke plugins.

---

## C. Terminal

### Glow (Charm)
- **License:** MIT. **Traction:** 27.9k stars, the most-starred tool on this list. **v3.0.0 (Aug 2026)** is a Bubble Tea v2 port with no UX changes.
- **Standouts:** A TUI that **discovers Markdown in subdirectories or the git repo**, a fast pager, stdin input, **fetching READMEs straight from GitHub/GitLab** (`glow github.com/x/y`) or HTTP, and styles plus word-wrap width. https://github.com/charmbracelet/glow , https://github.com/charmbracelet/glow/releases/tag/v3.0.0
- The "stash" (Charm Cloud sync and bookmarks) was removed when Charm Cloud was retired **(unverified)**.
- **Complaints:** No images, Mermaid, or math. Reading long prose in a terminal is tiring (HN).

### mdcat
- Rust, MIT. The original swsnr repo (2.4k stars) is **archived**; the maintained fork is BIRSAx2/mdcat (164 stars).
- **Standouts:** **Inline images** in iTerm2, kitty, and WezTerm, OSC8 clickable links, iTerm2 jump marks for headings. https://github.com/swsnr/mdcat

### Frogmouth (Textualize)
- Python/Textual, MIT. **Traction:** 3.3k stars, but **last push Aug 2024**.
- **Standouts:** A terminal Markdown *browser* with a navigation stack, history, **bookmarks**, TOC, and URL opening. https://github.com/Textualize/frogmouth

---

## D. Quick Look and Finder previews (macOS)

| Tool | Price/License | Traction | Standouts |
|---|---|---|---|
| **QLMarkdown (sbarex)** | GPL-3, free | 3.7k stars | Previews `.rmd`, `.qmd`, `.mdc` (Cursor rules), and MDX. Settings GUI, CLI converter, Shortcuts action, inline local images, Mermaid/MathJax. https://github.com/sbarex/QLMarkdown |
| **FluxMarkdown** | GPL-3, free | 1.3k stars | Quick Look port of Markdown Preview Enhanced: Mermaid, KaTeX, TOC, charts, export. **Sends pseudonymous usage stats by default.** https://github.com/xykong/flux-markdown |
| **showmd** | free | PH #5 of the day, 202 upvotes (Apr 2026) | **Renders agentic XML tags (`<thinking>`, etc.) as labeled blocks.** Collapsible frontmatter table, 190+ languages. Latest macOS only. https://www.producthunt.com/products/showmd-ai-markdown-quicklook-preview |
| **Marked QL** | $4.99 | new (Jul 2026) | Apex engine with multi-syntax support, an "Open in Marked" button, and `qlmanage` terminal previews. https://brettterpstra.com/2026/07/09/introducing-marked-ql-markdown-preview-in-finder/ |
| **Peekdown (macOS)** | OSS | 0–2 stars (several projects share the name) | Basic Quick Look render. https://github.com/h0ck3ystyx/peekdown |
| **Obsidian 1.14.4+** | free | — | Native Quick Look, styled to match your theme via the QuickCss plugin. |
| **toland/qlmarkdown** | legacy | 3.3k stars | The original QL generator, now superseded. |

**Shared complaint:** Quick Look can't live-reload while you edit (showmd maker) https://www.producthunt.com/products/showmd-ai-markdown-quicklook-preview

---

## E. Browser extensions

- **Markdown Viewer (simov):** ~500K users, 1.7k stars. Multiple parsers (marked, remark, markdown-it), 30+ themes, MathJax, Mermaid, TOC, autoreload, custom CSS. https://github.com/simov/markdown-viewer , https://www.chromeboard.com/extension/markdown-viewer-ckkdlimhmcjmikdlpkmbgfkaikojcbjk
- **Markdown Reader (md-reader):** 504 stars. 3.x is closed and the repo only collects issues. Syntax plugins (emoji, sub/sup, Gantt, alerts), hot reload, sidebar. https://github.com/md-reader/md-reader
- **Skim.md:** see section A.
- **MarkView extension:** claims diagrams, math, RTL, and Word/HTML/PDF export, rated 5.0. **ReadableMD** is a privacy-first local viewer. https://chromewebstore.google.com/search/rtl%20markdown
- **Shared complaint:** all of them need "Allow access to file URLs" for local files and have no file-system navigation.

---

## F. VS Code and JetBrains

### VS Code built-in preview
- **Free.** **1.121 (May 20 2026) built Mermaid in** (it was Matt Bierner's extension). It also added YAML frontmatter display in the preview and HTML file preview, and Mermaid renders in chat and notebooks with pan and zoom. https://gihyo.jp/article/2026/05/vscode-1.121 , https://machineherald-io.pages.dev/article/2026-05/22-vs-code-1121-ships-remote-agents-over-ssh-built-in-mermaid-diagrams-and-a-new-open-agent-protocol
- **Standouts:** Scroll sync, double-click to jump to source, link validation, Timeline local history.
- **Complaints:** Preview scrolls poorly (HN). It's an editor tab, not a reading experience.

### Markdown Preview Enhanced (shd101wyy)
- **License:** NCSA. **Traction:** 2.1k stars on the VS Code repo, 4.5k on the original Atom repo.
- **Standouts:** Automatic scroll sync. Many diagram engines (Mermaid, PlantUML, Graphviz, Vega, WaveDrom, D2, TikZ). Code chunk execution, reveal.js presentations, `@import` of files, Pandoc/ebook/PDF export **(unverified for the current version)**. **Now indexes notes for wikilinks, backlinks, tags, and a graph.** Explicit privacy statement. https://github.com/shd101wyy/vscode-markdown-preview-enhanced
- **Complaints:** Heavy, with a sprawling config.

### Markdown All in One (yzhang)
- **Traction:** ~14.9M installs, 4.5★. Auto-updating TOC, list editing, batch print to HTML, KaTeX, optional auto-preview. https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one

### Markdown RTL (JetBrains: IntelliJ, Android Studio)
- **License:** Apache-2.0. **Traction:** 26 stars, on the JetBrains Marketplace (plugin 34457).
- **Standouts:** **Per-element smart BiDi (Auto, Force RTL ⌥R, Force LTR).** Embedded **Vazirmatn** plus JetBrains Mono. Code is always LTR. **Language-aware Mermaid typography** (diagrams get FA/EN badges and fonts). Frontmatter card with field-level BiDi. A floating settings capsule that persists, with zero mutation of the `.md`. https://github.com/mahdiasd/MarkdownRTL , https://plugins.jetbrains.com/plugin/34457-markdown-rtl
- Related: **rtl-markdown** for VS Code (dalirnet, 47 stars) and **md-rtl-preview** for VS Code (auto-detects Arabic). https://github.com/dalirnet/rtl-markdown , https://github.com/ikhd/md-rtl-preview

---

## G. Agent-review tools (the closest category to `matn review`)

### Plannotator (backnotprop)
- **License:** MIT or Apache-2.0. **Traction:** **9.9k stars, 744 forks**, the category leader by far. Site: plannotator.ai.
- **Agents:** Claude Code, Codex, Gemini CLI, Copilot CLI, Amp, OpenCode, Kiro, Droid, Pi, and others. Also works in VS Code, Obsidian, Bear, and Notion, and has a TUI.
- **Standouts:** **Opens automatically when the agent proposes a plan.** Approve, or deny with structured feedback, then see a **plan diff of what changed after the revision**. Annotation types are comment, redline, markup, and label. Annotates files, folders, URLs, HTML, and the agent's last message (`/plannotator-last`). Does **code review** on diffs across Git, jj, GitButler, p4, and GitHub/GitLab PRs. **Inbox**: agents send questions and replies route back to the asking session. **Shares** go in the URL fragment, or as AES-256-GCM encrypted pastes that expire in 7 days and can be self-hosted. Auto-saves approved plans to Obsidian with frontmatter, or to Bear and Notion. Works over SSH and in devcontainers. Vim profile. SLSA provenance and SBOM. https://github.com/backnotprop/plannotator
- **Complaints:** The update check can't be disabled. Legacy sharing is being deprecated in favor of a hosted "Workspaces" product (waitlist). Browser UI.

### md-redline (dejuknow)
- **License:** MIT. **Traction:** 47 stars. Runs on macOS, Linux, Windows, and iPad Safari.
- **Standouts:** **Comments stored as invisible HTML markers inside the `.md` file** (no sidecar). **Two-way MCP**: the agent requests review and blocks until you answer, `mdr_ask` posts anchored questions, and the agent can leave its own anchored comments. A Claude Code hook captures a **baseline before agent edits so a diff view always works**. Threads with open/resolved states. Rendered, raw, and diff views. Copies hand-off prompts for several files at once. Overlapping comments with draggable anchors, plus pen and touch support. Commentable frontmatter. Atomic saves with mtime conflict detection. https://github.com/dejuknow/md-redline
- **Complaints:** Binds to localhost with no auth. Markers pollute the source.

### mdEditDiff (roy-vinay): **a direct competitor to "changes since last read"**
- **License:** MIT. Created Oct 16 2026, 0 stars. Mac app (not notarized) plus a CLI and MCP server.
- **Standouts:** **Per-reader bookmarks.** Each person or agent gets their own "last looked" revision per file, across sessions and tools. A private history of uncommitted edits is kept outside the repo. **Block-level, word-by-word semantic diff** treats rewraps and renumbering as no change, and each change is labelled with its section. Agents call `checkpoint` with a note, and MCP `changes_since` returns only the deltas to save tokens. The Mac app highlights changes since your last read with each agent's note, restores removed passages, and compares against any version. It has a **paginated Read mode like Preview** (thumbnails, Go to Page, two-up) and **5-color highlights plus notes that survive text changes**. Live refresh offers a choice when you have unsaved edits. Safe preview with no scripts or remote images. https://github.com/roy-vinay/mdeditdiff
- **Complaints:** The change view needs the Node CLI. Not notarized. Brand new.

### alson-annotation (`review-md`)
- **License:** MIT (npm). 0 stars, created Aug 2026.
- **Standouts:** `review-md doc.md` opens a browser review. On **Submit/Cancel** it prints **structured JSON** (line/column anchors, selected text, comment, document comments). **A questions file adds single- or multi-select survey questions for the reviewer.** MCP `review_markdown` tool. https://github.com/agnojf/alson-annotation

### md-review (ryo-manba)
- MIT, 30 stars. A CLI browser reviewer with line comments, a file tree, click-to-jump from a comment to its content, SSE hot reload, and comments copied out as agent feedback. https://github.com/ryo-manba/md-review

### mdxg-redline (oubakiou)
- MIT. Exports highlighted comments as structured JSON for LLMs and ships an `md-review` Claude/Codex skill. https://awesome.ecosyste.ms/projects/github.com%2Foubakiou%2Fmdxg-redline , https://dev.to/kiou_ouba_afbd120335456f3/the-next-bottleneck-after-ai-writes-your-code-is-reviewing-the-docs-it-writes-3pc7

### pi-mdiff (trycedar)
- Agent tools `md_inspect` (section map with line ranges) and `md_edit` (edit by heading path plus block index). https://pi.dev/packages/@trycedar/pi-mdiff

### Claude desktop and Codex (ChatGPT desktop) file previews
- **Claude Desktop:** the June 25 2026 build (v1.15962.0) **auto-refreshes Markdown, CSV, and images when Claude edits them** in the Code file viewer. Users repeatedly asked for rendered-versus-raw toggles, and one Windows side-panel bug was closed as not planned. https://claude.com/docs/cowork/changelog.md , https://claudeissues.com/issue/60432-feature-desktop-app-add-live-markdown-preview-in-files-panel , https://claudeissues.com/issue/87267-bug-desktop-app-side-panel-artifacts-file-previews-never-composite-renderer-repo
- **Codex in the ChatGPT desktop app** (macOS and Windows): **Markdown and code editing in-app, inline annotations, and "ask Codex to revise selected content"**, plus PR review in the sidebar. Open requests cover live refresh, selection comments in previews, and a bug where soft line breaks render as hard breaks. https://releases.sh/release/rel_jgrsgBNvtz26GcaJLq_n9-codex-joins-the-chatgpt-desktop-app-on-macos-and-windows , https://community.openai.com/t/feature-request-in-app-preview-for-markdown-files-in-codex-chatgpt-app/1388543.md
- **Threat:** the platform owners are absorbing the basic "see the agent's markdown rendered and comment on it" job. A standalone tool has to win on depth: RTL, history, reading, and cross-agent use.

---

## H. Arabic, RTL, and BiDi-specific

| Tool | Platform/License | Traction | Standouts |
|---|---|---|---|
| **ReyadMDX** (reyad-dev/mdx-reader) | Windows installer, portable, single-file offline HTML. MIT | 0 stars | **Per-block direction where ≥20% Arabic letters means RTL**, plus force RTL/LTR and a first-char mode. **`unicode-bidi: isolate` on inline code, links, and numbers.** Code always LTR. UI language independent of document direction. **Arabic search ignores diacritics and hamza variants.** Custom zero-dependency engine, sepia/midnight themes, width and line-height controls, split edit. https://github.com/reyad-dev/mdx-reader |
| **MdReader** (ali-joghataei) | Electron (Windows build documented). No license stated | 3 stars | Per-block majority-RTL detection that **beats `dir=auto` when a paragraph starts with English, class names, or inline code**. One window per file, read-only by default, system font picker, README in FA/AR/HE/UR. https://github.com/ali-joghataei/mdreader |
| **قارئ MD** (Eng-mo7a/md-reader) | Single web page in Chrome/Edge. Egyptian-Arabic UI | 0 stars | Direction per line, **a copy button on every command**, heading sidebar, live reload via the File System Access API, multiple files. Needs network on first load for font and lib. https://github.com/Eng-mo7a/md-reader |
| **MD Reader (Arabic, Microsoft Store)** | Windows | — | **Could not verify.** The Store pages need JS, and no search hit. Only a Python/tkinter "MD Reader" on GitHub turned up, with no RTL mentioned. https://github.com/Ciberdim/j-md-reader/releases |
| **Markdown RTL** (JetBrains) | see F | 26 stars | Vazirmatn, smart BiDi, language-aware Mermaid. |
| **RTL Markdown Viewer** (Chrome) | Chrome Web Store | no ratings | "Accurate Arabic, Hebrew, and mixed RTL/LTR rendering" of local files. https://chromewebstore.google.com/search/rtl%20markdown |
| **RTL Support** (Obsidian, esm7) | Obsidian plugin, free | 154 stars | Default and per-note direction, **frontmatter `direction: rtl/ltr/auto`**, remembers per file. v2 sits on Obsidian's native auto-RTL. https://github.com/esm7/obsidian-rtl |
| **Content RTL / Any RTL** (Obsidian) | plugins | — | Per-line direction by script detection. https://community.obsidian.md/plugins/content-rtl |
| **Generic Chrome BiDi fixers** | Multi-RTL, AutoRTL, BiDi, RTL Flow | — | First-strong-character detection, MutationObserver for SPAs, math-formula alignment (Multi-RTL). https://chromewebstore.google.com/detail/multi-rtl/nhajcafhnpnnfeniefjmaplmeodoffem |
| **Ramz** | web editor | — | Older "Markdown editor that understands Arabic". https://www.github.com/MohamedYoussouf/ramz |

**What this category shows:** every RTL tool solves *direction* (per block or line, with code kept LTR). Almost none handles **Arabic typography** (kashida and justification, Naskh fonts, diacritics-aware search beyond ReyadMDX, Arabic-Indic numerals, mixed-direction tables, Mermaid in Arabic beyond the JetBrains plugin). All have negligible traction. **No serious, polished Arabic-first reader exists**, so the niche is open for Matn.

---

## Standout features across the market (deduplicated)

| # | Feature | Who has it | Source |
|---|---|---|---|
| 1 | Watch file and live reload on save/agent edit | Marked, MacMD, mo, Skim.md, md-review, md-redline, mdEditDiff, Claude Desktop, md-reader ext, Eng-mo7a | https://marked2app.com/ |
| 2 | Auto-open files an agent writes | MacMD Viewer (hook), Plannotator (on plan proposal) | https://macmdviewer.com/blog/best-markdown-viewer-mac |
| 3 | Approve/deny plan with structured feedback to the agent | Plannotator, Imark | https://github.com/backnotprop/plannotator |
| 4 | Agent blocks on human review via MCP / anchored agent questions | md-redline (`mdr_ask`), alson-annotation, Plannotator Inbox | https://github.com/dejuknow/md-redline |
| 5 | Structured JSON review output (anchors, selected text, comment) | alson-annotation, mdxg-redline, Marked (JSON highlights) | https://github.com/agnojf/alson-annotation |
| 6 | Reviewer questionnaire (single/multi-select) | alson-annotation | https://github.com/agnojf/alson-annotation |
| 7 | Plan diff after the agent revises | Plannotator, md-redline (baseline hook) | https://github.com/backnotprop/plannotator |
| 8 | Per-reader "changes since you last read" with semantic block/word diff and who changed it | mdEditDiff, Matn; MarkViewer has a basic on-disk diff banner | https://github.com/roy-vinay/mdeditdiff |
| 9 | Restore removed passages, compare with any earlier version | mdEditDiff, VS Code Timeline | https://github.com/roy-vinay/mdeditdiff |
| 10 | Reading position memory with Resume or Start from Here | Marked 3 Reading Mode | https://brettterpstra.com/2026/08/21/new-in-marked-3-reading-mode/ |
| 11 | Block-by-block j/k reading with focus dimming | Marked 3, iA Writer (Focus Mode, while writing), Skim.md (Tab blocks) | https://brettterpstra.com/2026/08/21/new-in-marked-3-reading-mode/ |
| 12 | Highlights and notes, export to Readwise CSV/JSON/MD, import-merge by stable ID, CriticMarkup inject | Marked 3 | same |
| 13 | Multi-color highlights anchored so they survive text edits | mdEditDiff (5 colors), Obsidian 1.14 highlight colors | https://github.com/roy-vinay/mdeditdiff |
| 14 | Annotations stored inside the file (HTML markers) vs. sidecar (`highlights.json` in TextBundle) | md-redline (in-file), Marked (TextBundle sidecar) | https://github.com/dejuknow/md-redline |
| 15 | Threaded comments with resolve states | md-redline, Plannotator | https://github.com/dejuknow/md-redline |
| 16 | Authorship: human vs. AI vs. pasted text colors | iA Writer | https://ia.net/writer/support/editor/authorship |
| 17 | Proofing: repetition, keyword density/drift, readability scores | Marked, iA Writer Style Check | https://marked2app.com/ |
| 18 | Custom pre-processors/processors (any syntax) | Marked | https://marked2app.com/ |
| 19 | Seamless WYSIWYG live preview (syntax hides) | Typora, MarkEdit "syntax-hidden", Obsidian Live Preview | https://typora.io/ |
| 20 | Hover preview of links, transclusion embeds, graph, backlinks | Obsidian, MPE (wikilinks, backlinks, graph) | https://help.obsidian.md/Plugins/Page+preview |
| 21 | Open any file outside a vault / be the default `.md` app | Obsidian 1.14.2, mdEditDiff, MacMD | https://obsidian.md/changelog/2026-09-15-desktop-v1.14.2/ |
| 22 | Quick Look Finder preview | QLMarkdown, FluxMarkdown, showmd, Marked QL, MacMD, Obsidian 1.14.4, markview, Glance | https://github.com/sbarex/QLMarkdown |
| 23 | Render agent XML tags (`<thinking>`, …) as labeled blocks | showmd | https://www.producthunt.com/products/showmd-ai-markdown-quicklook-preview |
| 24 | Preview `.mdc` Cursor rules, `.qmd`, `.rmd`, MDX | QLMarkdown, mo (MDX), md-review (MDX) | https://github.com/sbarex/QLMarkdown |
| 25 | Frontmatter as a collapsible/metadata card | showmd, Skim.md, Markdown RTL, mo, VS Code 1.121 | https://www.producthunt.com/products/showmd-ai-markdown-quicklook-preview |
| 26 | Mermaid with fullscreen/zoom/pan | mo, QuickMD, Markdown RTL, VS Code 1.121 | https://github.com/k1LoW/mo |
| 27 | Many diagram engines (PlantUML, Graphviz, Vega, D2, TikZ) | MPE | https://github.com/shd101wyy/vscode-markdown-preview-enhanced |
| 28 | Folder/repo discovery of markdown files | Glow, mo (groups, globs), md-review, MacDown 3000 (`macdown .`) | https://github.com/charmbracelet/glow |
| 29 | Full-text search across files | mo, Neilooo/md-reader, Typora | https://github.com/k1LoW/mo |
| 30 | Diacritic- and hamza-insensitive Arabic search | ReyadMDX, Matn | https://github.com/reyad-dev/mdx-reader |
| 31 | Per-block auto direction smarter than `dir=auto`; code always LTR; inline bidi isolation | ReyadMDX, MdReader, Markdown RTL, Obsidian 1.6+, RTL Support plugin | https://github.com/reyad-dev/mdx-reader |
| 32 | Per-document direction in frontmatter | Obsidian RTL Support plugin | https://github.com/esm7/obsidian-rtl |
| 33 | Embedded Arabic/Persian font (Vazirmatn), language-aware diagram fonts | Markdown RTL (JetBrains) | https://github.com/mahdiasd/MarkdownRTL |
| 34 | Fetch and render remote README (GitHub/GitLab/HTTP) | Glow, Frogmouth, Markdown Viewer ext, md-reader ext | https://github.com/charmbracelet/glow |
| 35 | Terminal inline images and OSC8 links | mdcat | https://github.com/swsnr/mdcat |
| 36 | Browser-like history and bookmarks for docs | Frogmouth | https://github.com/Textualize/frogmouth |
| 37 | Paginated Read view (pages, thumbnails, two-up, Go to Page) | mdEditDiff | https://github.com/roy-vinay/mdeditdiff |
| 38 | Speed Read (RSVP) | Marked 3 | https://brettterpstra.com/2026/06/01/marked-3-updates/ |
| 39 | Export PDF/DOCX/EPUB/standalone offline HTML | Marked, Typora, Skim.md, ReyadMDX, MacMD | https://typora.io/ |
| 40 | Private share link (content in URL fragment / E2E-encrypted paste) | SDocs, Plannotator | https://hn.svelte.dev/item/47777633 |
| 41 | "Copy for AI" (rendered page or selection back to Markdown) | Skim.md, mo (copy MD/Text/HTML) | https://github.com/skim-md/skim |
| 42 | Hand-off prompt copied for one or many files | md-redline | https://github.com/dejuknow/md-redline |
| 43 | Save approved plans to Obsidian/Bear/Notion | Plannotator | https://github.com/backnotprop/plannotator |
| 44 | Code review of diffs (git/jj/PR) beside doc review | Plannotator, Codex desktop | https://github.com/backnotprop/plannotator |
| 45 | "Revise selected content" (select text, ask agent to rewrite) | Codex in ChatGPT desktop | https://releases.sh/release/rel_jgrsgBNvtz26GcaJLq_n9-codex-joins-the-chatgpt-desktop-app-on-macos-and-windows |
| 46 | App MCP server / CLI for agents to read notes | Bear 2.8, Inkdrop v6, mdEditDiff, md-redline, markview | https://releasebot.io/updates/bear/bear |
| 47 | Safe preview (no scripts, no remote images), read-only guarantee | mdEditDiff, MacMD | https://github.com/roy-vinay/mdeditdiff |
| 48 | Encoding detection (UTF-16, legacy) and large-file guard | Skim.md | https://github.com/skim-md/skim |
| 49 | Copy button on code/commands | Eng-mo7a, Skim.md | https://github.com/Eng-mo7a/md-reader |
| 50 | Vim keybindings | Plannotator, Skim.md, Marked j/k | https://github.com/backnotprop/plannotator |
| 51 | Touch/pen annotation on iPad | md-redline | https://github.com/dejuknow/md-redline |
| 52 | Remote/SSH/devcontainer use | Plannotator (fixed port) | https://github.com/backnotprop/plannotator |
