# Market research — November 2026

Question: what would make Matn the best Markdown reader for Arabic readers and for people who read what coding agents write, and what does every serious competitor have that Matn must match or beat?

Raw material, kept with this file:

- [013-research/competitors.md](./013-research/competitors.md) — about 35 tools in 8 categories, each with platform, price, traction, standout features, complaints and sources.
- [013-research/demand.md](./013-research/demand.md) — what people ask for on Hacker News, GitHub issues and the Cursor, OpenAI and Obsidian forums since January 2025, ranked by independent voices.
- Reddit was read directly (Arctic Shift archive): r/ClaudeCode, r/ClaudeAI, r/macapps, r/ChatGPTCoding. Threads cited below.

## The three findings that set direction

**1. A viewer is a commodity; the review loop is the product.** About 30 "Show HN" Markdown viewers appeared in 2025–2026 and almost none passed 10 points. On r/ClaudeCode a 6MB native viewer drew "editing md files is a totally solved problem" ([1run93c](https://reddit.com/comments/1run93c)). Meanwhile Plannotator, a tool for annotating a plan and sending the notes back to the agent, reached 9.9k stars in about ten months, and at least eight similar tools exist (crit, ipe, open-plan-annotator, md-redline, revdiff, alson-annotation, nanotation, seal). The phrase repeated in those threads: plan review gets skipped because giving feedback costs too much, so the default becomes "looks good, proceed" ([1ro4zk5](https://reddit.com/comments/1ro4zk5)).

**2. Arabic is an open field, and the agents make it urgent.** Right-to-left text is broken in Claude Code (terminal, VS Code extension, desktop, web), Codex, Cursor, VS Code and Zed: 20+ issues, several with 100–300 reactions, none fully fixed (demand.md §8). The loudest voices are Hebrew, then Persian, then Arabic developers. Every Arabic-first reader found has between 0 and 154 stars (ReyadMDX, MdReader, md-reader, the JetBrains Markdown RTL plugin). Nobody combines correct mixed-direction rendering with the agent loop.

**3. The platforms are moving in.** Codex in the ChatGPT desktop app now edits Markdown in-app with inline annotations and "revise selected content"; Claude Desktop refreshes Markdown when Claude edits it. A standalone reader survives only where the platforms are weak: Arabic, cross-agent and cross-editor workflows, and reading quality.

## What people ask for, ranked (from demand.md, with Reddit added)

| # | Need | Voices | Matn today |
|---|---|---|---|
| 1 | Inline comments on a plan that go back to the agent | 25+ | **Has** `matn review` (waits, prints notes). Missing: approve / request changes, suggested edits, plan-mode hook |
| 2 | View refreshes when the agent rewrites the file | 12+ | **Has** live reload with place kept |
| 3 | What changed since I last read it | 10+ | **Has** block-level, one human reader. Missing: word-level inside blocks, a last-read point per agent |
| 4 | Open any .md instantly, no vault, default app | 15+ | **Has** droplet + `matn file.md`. Missing: native app (separate sub-project) |
| 5 | Folder / multi-repo view, find the file the agent just wrote | 10+ | **Partial** folder tree, recents. Missing: "written by agents recently" feed |
| 6 | Mermaid, LaTeX, tables rendered well | 15+ | **Has** Mermaid (hover magnify), KaTeX, GFM. Missing: Mermaid pan/zoom |
| 7 | Reading comfort: font, size, width | 10+ | **Has** |
| 8 | RTL that works with mixed code and paths | 20+ | **Has**, and it is the moat |
| 9 | Copy as Markdown, export, share | 10+ | **Has** export (PDF/HTML/DOCX/EPUB/MD). Missing: share link without a server |
| 10 | Search across scattered agent files | 6+ | **Has** library search with Arabic normalisation |
| 11 | Hooks: open automatically when a plan is ready, approve or reject | 10+ | **Missing** |
| 12 | Native, light, fast | 10+ | **Missing** (Mac app sub-project) |
| 13 | Quick Look in Finder | 6+ | **Missing** |
| 14 | CLI open command, round-trip to the editor | 10+ | **Has** `matn`, `--editor` |
| 15 | One key between rendered and raw | 6+ | **Has** `</>` |
| — | Diff between plan versions ("the killer feature", [1rmv4el](https://reddit.com/comments/1rmv4el)) | 5+ | **Partial** via since-last-read |
| — | Notes that survive the agent's rewrite | 4+ | **Partial** prefix/suffix anchors, orphan state |
| — | Live render of a reply the agent never saved (MarkView `preview_markdown`, [1rjshs2](https://reddit.com/comments/1rjshs2)) | 3+ | **Partial** stdin and paste |

## Standout features in the market, and Matn's answer

Grouped by who has them; full sources in competitors.md.

**Agent loop.** Auto-open what the agent writes (MacMD, Plannotator). Approve or deny with structured feedback (Plannotator, Imark). The agent waits on the review (md-redline, alson-annotation; Matn has this). Questions the reviewer answers (alson-annotation). Plan diff after revision (Plannotator, md-redline, ipe). Suggested replace / delete / insert on a selection (open-plan-annotator). Revise selected content (Codex desktop). MCP server so any agent can open or read (markview, mdEditDiff, md-redline, Bear, Inkdrop).
→ Sub-project 1 (this one) covers all of these except MCP, which follows it.

**Change awareness.** Per-reader last-read with word diff and restore (mdEditDiff, created October 2026 — the closest competitor to Matn's newest feature).
→ Sub-project 1 adds per-agent last-read; word diff inside a changed block is a contained follow-up.

**Reading and annotation.** Marked 3 Reading Mode (August 2026): resume position, j/k block stepping with focus dimming, highlights exported to Readwise CSV / JSON / CriticMarkup. Authorship colours, human vs AI (iA Writer). Threaded, resolvable comments (md-redline, Plannotator).
→ Matn has resume and focus mode. j/k stepping, export of notes, and resolved state are small additions; authorship colours become cheap once per-agent history exists.

**Rendering.** Agent XML tags such as `<thinking>` shown as labelled blocks (showmd). `.mdc`, `.qmd`, MDX (QLMarkdown, mo). Many diagram engines (Markdown Preview Enhanced). Rendering local HTML reports (the Claude Code team's HTML post, 528 points).
→ Agent tags and `.mdc` are cheap and fit the agent audience. More diagram engines: rejected for now (dependencies).

**Arabic.** Per-block direction, code always LTR, isolated inline runs (ReyadMDX, MdReader, Markdown RTL, Obsidian). Direction in frontmatter (Obsidian RTL plugin). Fonts matched to language inside diagrams (Markdown RTL). Arabic search ignoring diacritics and hamza (ReyadMDX, Matn).
→ Matn has all but frontmatter direction and diagram font matching. Nobody owns Arabic typography beyond direction: kashida-aware justification, Arabic-Indic digits on request, and correct mixed-direction rendering of agent replies are where Matn can lead.

**Access.** Quick Look (QLMarkdown 3.7k stars, FluxMarkdown, showmd, Marked, MacMD, Obsidian). Default `.md` app (Obsidian 1.14, MacMD). Remote READMEs (Glow, Frogmouth). Share links with content in the URL fragment (SDocs, Plannotator).
→ Quick Look and native belong to the Mac app sub-project. Share links are a self-contained follow-up.

**Deliberately not copied:** editing and live-preview editing (Typora, MarkEdit) — Matn stays a reader; graph view and Bases; proofing and speed reading (Marked) — low demand in this audience; a TUI (crit, Glow) — the terminal cannot render Arabic correctly, which is the reason Matn exists.

## Order of work

1. **Agent integration** — a Claude Code plugin and a Codex setup built on the existing CLI. Design: [specs/2026-11-05-agent-integration-design.md](./specs/2026-11-05-agent-integration-design.md).
2. **VS Code** — Arabic-correct rendering inside the built-in preview, plus "Open in Matn".
3. **Mac app** — native shell, Quick Look, default app. Direct download (decided 2026-10-29).
4. Contained follow-ups from the tables above: word diff inside blocks, j/k stepping, notes export, agent XML tags, `.mdc`, frontmatter direction, share links, MCP server.

## Limits

- X/Twitter was not reachable directly; the only X signal is second-hand through blogs and HN.
- The Reddit archive returned little after March 2026 for some subreddits; HN and GitHub cover the later months.
- Vote counts and star counts were read when gathered and change daily. Entries marked "(unverified)" in competitors.md were not confirmed against a primary source.
