# UI critique — November 2026

Method: dual-agent (impeccable critique: A design review, B detector + browser evidence), plus a hands-on audit at 1440, 1100 and 390 px in light and dark. Raw evidence stayed in the session scratchpad.

## Score

Nielsen heuristics: **19/40 (Poor)**. Lowest: consistency (1), error recovery (1). Cognitive load: 5 of 8 checks fail.

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of status | 2 | two "current" items in the outline; approval reported success with nobody waiting |
| 2 | Match with the real world | 2 | jargon: «سلامة المستند», raw `18px`, vim `g`/`G` |
| 3 | User control | 2 | Esc discarded a typed note; LICENSE link dead-ended |
| 4 | Consistency | 1 | English UI half Arabic; tree right-aligned in LTR; features differ by width |
| 5 | Error prevention | 2 | plan approval had no confirmation |
| 6 | Recognition | 2 | 8+ unlabeled 28px toolbar icons |
| 7 | Flexibility | 3 | ⌘K, `/`, `?` good; letter shortcuts dead on Arabic layout |
| 8 | Minimalist design | 2 | the text column is good; the chrome around it is noisy |
| 9 | Error recovery | 1 | raw "not found", generic «فشل», double-escaped alt text |
| 10 | Help | 2 | nothing explains review/gate or the inspector tabs |

## Verdict

The reading column is Matn's own: per-block direction, Arabic presets and curated Arabic fonts. The chrome is not: three floating glass toolbar islands, glass popovers and a glass settings sheet that look like macOS but behave like a web page. Content scrolls visibly under the title, panels went see-through over bright images, and the toolbar is icon-only. It reads as an imitation of Apple, not as Apple quality.

## Fixed in 77fbafa (functional, no taste involved)

1. Text clipped on the left edge (fold grid blowout; the phone lost half of every line).
2. README `<details>`, `<summary>` and `<kbd>` shown as raw tags.
3. GitHub-style `#heading` links went nowhere.
4. Remote images showed as broken icons; now quiet links.
5. The selection toolbar stayed put while the page scrolled.
6. The settings sheet and menus went transparent over bright content.
7. Settings unreachable on phones; the inspector vanished below 1240 px.
8. Letter shortcuts dead on the Arabic keyboard layout; ⌘↑/⌘↓ added.
9. The outline marked two sections as current.
10. Esc discarded a typed note without asking.
11. Approval took one press and claimed success with no agent waiting.
12. The disabled «اطلب تعديلًا» looked enabled.
13. Non-Markdown local links (LICENSE) opened a blank "not found" page.
14. Double-escaped alt text (`&amp;gt;=`).
15. Arabic source view drawn left to right.
16. Folder names oversized and the tree right-aligned in the English UI.
17. Phone start screen 47 px wider than the screen.
18. 10 px meta text, 2.4:1 code comments, 28 px tap targets on touch.

## Left for the redesign (taste and structure)

- **P0, the chrome.** Title and toolbars have no band; content collides with them. Glass is used as the background behind text.
- **P1, density.** At 1440 px a document shows a 32-file tree, a three-tab inspector, three toolbar clusters and the text at once. The settings sheet has 25+ controls in one scroll.
- **P1, the review moment.** Approving a plan an agent will execute is the product's key moment and its least designed surface: a translucent pill with grey hint text, and no summary of what is being approved.
- **P2:** fold chevrons read as "back" arrows in Arabic; heading ¶ and # float far from the text; 3 tab stops per heading; 10–12 px grey labels at about 3.4:1.
