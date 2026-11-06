# DESIGN.md — Matn

Derived from the shipped reader (`src/index.html`), not from intentions. The direction contract lives in `.impeccable/surfaces/src-index-html.md`; screenshots of every surface on desktop and phone are in `docs/goal/shots/`.

## Thesis

A native macOS document utility, built right to left first. Its own idea is **marginalia**: a note sits in the margin beside the text it glosses, the way commentary sits beside a *matn*. The text is the largest, calmest thing on screen. Chrome is a keystroke away and steps aside while you read.

Refused on purpose: floating glass toolbar islands, glass behind text, the cream-serif "book" costume, coloured top or side borders on cards.

## Layout

| Region | Desktop | Phone (≤ 820px) |
|---|---|---|
| Title bar | 52px, unified: back/forward, file name and reading time centred, actions trailing | 44px targets; labels hidden, every control keeps an `aria-label` |
| Library | 248px sidebar at the leading edge (right in Arabic) | drawer, 86vw up to 320px, over a dimmed backdrop |
| Document | centred column, `--measure` (about 75 characters) | full width, 16px gutters |
| Inspector | closed by default, remembers the choice; popover under 1240px | popover |
| Margin notes | in the trailing margin when it is at least 200px wide | a tap on the highlight opens the note |
| Document map | hairline rail of heading marks at the edge | 44px round button that steps aside while reading down |
| Review / changes bars | solid bar along the bottom | full-width bottom bar; hidden while the drawer is open |

## Colour

One accent, everything else neutral. The accent means "the thing you act on" (primary button, current file, focus ring) and nothing else.

| Token | Light | Dark |
|---|---|---|
| `--canvas` (document) | `#ffffff` | `#1e1e1e` |
| `--chrome` (sidebar, quiet surfaces) | `#f5f5f4` | `#262626` |
| `--raised` (popovers, bars) | `#ffffff` | `#2c2c2e` |
| `--ink` / `--ink-2` / `--ink-3` / `--ink-4` | `#1d1d1f` / `#424245` / `#6b6b70` / `#a1a1a6` | `#f2f2f4` / `#c9c9ce` / `#9a9aa0` / `#636366` |
| `--accent` | `#0b7a68` | `#3cc4a4` (text), `#13806b` (fills) |
| `--accent-soft` | accent at 11% | accent at 15% |

Sepia (`#f8f2e4` canvas, `#3a2e1d` ink, accent `#0a6b5b`) and Night (`#000` canvas, `#ddd8cf` ink) follow the same roles. Separators are hairlines (`--line`, 10% ink). Highlights use four translucent hues (yellow, green, blue, rose) so the text stays readable under them. Diffs use green / amber / red with an icon or label, never colour alone.

Mermaid diagrams take the theme's own tokens (surface, accent border, ink) instead of Mermaid's lavender.

## Type

- **Chrome:** SF Pro / SF Arabic at 13px (`--t-ui`), 12px and 11px for secondary lines. Never below 11px.
- **Reading:** chosen by the reader (system, Noto Naskh, Amiri, IBM Plex Sans Arabic, Tajawal, optional Thmanyah), 18px by default, line height 1.85, all bundled and offline.
- **Code and paths:** `ui-monospace`. Arabic never goes in the monospace face; it disconnects the letters.
- File names and other user strings sit in `<bdi>` or between FSI/PDI marks, so a Latin name inside an Arabic sentence keeps its order.

## Shape and depth

- Radii: 4 / 6 / 8 / 12px (`--r-xs` … `--r-lg`); controls are 6px.
- One shadow for popovers and bars (`--shadow`), one for drawers and dialogs (`--shadow-lg`): a half-pixel outline plus a soft drop. No glass, no blur behind text.

## State as marks

State is shown by a mark, not by a hue: a **flag** where you stopped reading, a **tick** for a finished document or a note the agent answered, a **dash** for one it did not. The marks are CSS masks (`--mark-flag`, `--mark-tick`, `--mark-dash`), so they take the ink colour of their row.

## Motion

160ms with `cubic-bezier(.2,.8,.2,1)` for UI; transform and opacity only, and `prefers-reduced-motion` turns it off. Nothing is translucent, so there is no reduced-transparency variant to keep.

## Direction and language

- The interface is Arabic by default and fully English when switched; no Arabic remains in the English interface (an e2e check enforces it, with labels for screen readers included).
- The document's direction comes from its front matter (`dir`, `lang`) or its dominant script, block by block.
- Every surface is designed right to left first and checked left to right.

## Touch

44pt targets on coarse pointers. On touch, the selection toolbar sits below the selection, so it doesn't collide with the system's own Copy / Look Up menu above it.
