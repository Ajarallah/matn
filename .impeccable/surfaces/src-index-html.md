---
version: 1
slug: "src-index-html"
primary_target: "src/index.html"
related_targets: []
---

## Scope

The whole reader shell of src/index.html: window chrome, library sidebar, inspector, document surface, popovers, dialogs, review and changes bars, phone layout. Mode: Read, with Operate chrome.

## Direction contract

THESIS: A native macOS document utility (the grammar of Preview, Finder and Xcode's editor) built right-to-left first, whose own idea is marginalia: notes sit beside the text they gloss, as commentary sits beside a matn. It refuses the floating-glass-island toolbar and the cream-serif "book" costume.
OWN-WORLD: System neutrals in two appearances (white #FFFFFF / #1E1E1E content; #F5F5F4 / #262626 sidebar), one ink-teal accent #0B7A68 / #3CC4A4, hairline separators, 6px control radius, SF and SF Arabic at 13px for chrome. State is a mark, not a hue: a flag where you stopped, a tick for a note the agent answered, a dash for one it did not.
STORY: The reader opens a file and the text is already the largest, calmest thing on screen; library and outline are a keystroke away; their notes live in the margin; the decision is a solid bar that says what is being approved.
FIRST VIEWPORT: Unified 52px title bar (back/forward, file name and reading time centered, actions trailing), library sidebar 248px at the leading edge, document column 68ch centered, inspector collapsed, margin notes when width allows.
FORM: Native utility, own-list position 4, seed c537050d.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Raises

- From the cutting bench (declined): state as marks, not colors.
- From the margin book (my top grounded candidate): notes as marginalia.
