# Changelog

All notable changes to Matn are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com).

## [Unreleased]

### Added
- أوضاع مصيّر/مصدر/تقسيم مع أرقام أسطر وبحث ونسخ وربط عناوين العرض بسطر Markdown، من دون تحرير أو حفظ.
- دعم `command | matn -` لقراءة stdin في جلسة مؤقتة خاصة بحد 16MB واسم عرض اختياري وتنظيف آمن.
- وضع كتاب يقرأ `SUMMARY.md` مع ترتيب هرمي وسابق/تالٍ وتقدم إجمالي وحدود فصول، دون build أو كتابة ملفات.
- نسخ غني يكتب HTML والنص معًا ويحافظ على RTL والعناوين والقوائم والجداول والكود، مع تنظيف عناصر الواجهة والسكريبتات.
- تقرير «سلامة المستند» للروابط والصور والعناوين الداخلية المفقودة، مع منع عبور الجذر وعدم فحص الشبكة.
- وضع مستند كبير يصيّر الملفات الأكبر من 2MB في Web Worker ويحمّلها تدريجيًا، مع عقد أداء آلي لملف 10MB ومجلد من 2,000 ملف.
- شاشة بداية واستئناف موضع القراءة لكل ملف ومجلد.
- بحث عربي شامل، ومبدّل ملفات سريع، وروابط داخلية وواردة مع معاينة وتاريخ تنقّل.
- مفضلة و«أكمل لاحقًا» وتمييز وتعليقات جانبية لا تعدّل Markdown، مع تصديرها إلى Markdown.
- خريطة مستند مصغّرة، ووضع تركيز، وإعدادات قراءة مسبقة، وطي الأقسام، ودرج جوال.
- إجراءات آمنة لفتح المحرر وإظهار الملف ونقله إلى سلة النظام بعد تأكيد صريح.
- Skill للمشروع تفتح الملفات في متن من Claude Code عبر `/matn-open`.
- تكامل macOS اختياري يضيف **Matn** إلى قائمة **Open in** في Codex عبر
  `desktop.custom_file_handlers`، ويثبّت `/matn-open` على مستوى المستخدم في Claude Code.

### Changed
- أنماط القراءة تشرح بوضوح نوع المحتوى الذي يناسب كل نمط، بدل الاكتفاء بأسماء عامة.
- خريطة المستند تكشف عنوان كل خط عند المرور، وتنتقل إليه بالنقر، وتغلق قائمتها بالنقر خارجها.
- طيّ الأقسام صار متحركًا وحالته المرئية أوضح، مع تسميات وصول دقيقة للطي والتوسيع.
- أقسام المفضلة و«أكمل لاحقًا» والملاحظات موحّدة الاتجاه والأيقونات والعدادات، وتظهر يمين الواجهة العربية.

### Fixed
- أدوات تحديد النص تظهر بعد سحب واحد، وتنفّذ التمييز والملاحظة والمفضلة والنسخ مع نتيجة مرئية ومسار نسخ احتياطي.
- اللوحات والقوائم المؤقتة تغلق بالنقر خارجها أو بمفتاح `Esc` بدل بقائها عالقة.
- استُبدلت كلمة «حي» المبهمة بمؤشر اتصال هادئ يشرح وظيفة التحديث التلقائي عند المرور.

### Security
- رمز جلسة عشوائي وفحص `Origin` لكل عمليات الكتابة والتشغيل، مع منع عبور الجذر والروابط الرمزية.

## [1.2.7] — 2026-07-08

### Added
- **Ignores GitHub layout wrappers.** A `<div dir="rtl">` or `<div align="…">`
  wrapper (the common way to force RTL on a GitHub README) no longer shows up as
  escaped text — Matn sets direction itself, so those standalone wrapper tags are
  dropped. Arabic READMEs written for GitHub now render cleanly in Matn too.

## [1.2.6] — 2026-07-08

### Fixed
- **One column for everything.** Code blocks, tables, and diagrams used to break
  out wider than the prose, so their edges didn't line up with the text — it read
  as content leaking past the column. Now every block shares the same reading
  column; anything too wide (a big table, a long code line) scrolls inside its own
  box instead of bursting past the text width. Verified on a real document, not
  just the demo.

## [1.2.5] — 2026-07-08

### Changed
- **Reading width now has a sensible maximum.** The 1.2.3–1.2.4 widening let
  «واسع/Wide» stretch nearly edge to edge, which read as a wall of text. The
  ceiling is back to a comfortable ~1008px column (about two thirds of a
  1512px window), matching the intended reading measure. Presets are now
  80 / 96 / 112 (default 112 = that ceiling). Any wider value saved from an
  earlier build is clamped down automatically.

## [1.2.4] — 2026-07-08

### Changed
- **Font picker is now a dropdown** instead of a full stack of preview buttons,
  so the settings panel stays compact. Each option still previews in its own
  typeface where the browser supports it.
- **Wider width presets.** The narrowest step was dropped and the scale shifted
  up: «ضيّق/Narrow» now equals the old medium, «متوسط/Medium» the old wide, and
  «واسع/Wide» is wider still (112 / 136 / 160; default medium).

## [1.2.3] — 2026-07-08

### Added
- **Text alignment control (Word-style).** A new setting lets the reader choose
  how paragraphs sit: **من اليمين / Start** (natural RTL, ragged edge) or
  **ضبط الأسطر / Justify** (even line lengths on both edges). Headings and tables
  always stay start-aligned.

### Changed
- **Wider reading space.** The reading column now uses much more of the pane —
  «واسع/Wide» fills it almost edge to edge (page cap raised 1120→1320px; width
  presets are now 88 / 112 / 136, default medium 112 ≈ 1008px at the base font
  size). Text still starts from the right.

## [1.2.2] — 2026-07-08

### Fixed
- **Consistent RTL for mixed-language text.** Flow-text blocks (headings,
  paragraphs, list items, blockquotes) now follow the document's dominant
  direction, so a heading that merely starts with a Latin word — e.g.
  `Context (لماذا نبني هذا)` — no longer flips the whole line to LTR in an
  Arabic document. Latin runs still read left-to-right inside the RTL line;
  table cells keep per-content `auto` detection.
- **Reading column is now truly centered.** The prose column used
  `margin-inline:auto`, but per-element margin shorthands (`#doc p{margin:.7em 0}`,
  heading margins, …) silently reset those inline margins to `0`, pinning the
  whole column to the start edge and dumping all the empty space on the other
  side. Replaced the fragile per-block centering with a full-bleed CSS grid:
  a centered reading column with side tracks that wide blocks (tables, code,
  diagrams) break out into. Whitespace is now symmetric.
- **Double-click on macOS no longer hangs the app.** The `Matn.app` droplet ran
  its launcher via AppleScript `do shell script`, which blocks until the command
  returns — but `matn` is a persistent server that never returns, so the app hung
  and ignored later double-clicks until a 120s timeout. The launcher now starts
  matn detached and returns immediately.

### Changed
- Default reading width widened (medium 64→72) so the column fills more of the
  pane on large screens; width options are now 56 / 72 / 88.

## [1.2.1] — 2026-07-07

### Fixed
- **Math now renders reliably everywhere.** LaTeX is extracted before Markdown
  runs (so CommonMark can't strip `\,`/`\{` backslashes) and rendered with
  `katex.render`; block `$$…$$` shows as centered display math. The static demo
  build no longer collapses `$$` to `$` (a `String.replace` `$$` gotcha).
- Frontmatter detection tolerates a leading blank line.

## [1.2.0] — 2026-07-07

### Added
- **Frontmatter card** — leading YAML `---…---` is parsed into a collapsible
  metadata card (collapsed by default) instead of being dumped as raw text.
- **Math (KaTeX)** — inline `$…$` / `\(…\)` and block `$$…$$` / `\[…\]`
  render with KaTeX, lazy-loaded and offline (fonts vendored). A price like
  `$5` won't trigger it.
- **Footnotes** — GitHub-style `[^ref]` with a linked footnotes section
  (via marked-footnote).
- **File tree** — folder mode now shows a nested, collapsible directory tree
  instead of a flat list.

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
