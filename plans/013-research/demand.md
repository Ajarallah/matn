# What people want from a Markdown reader (2025–2026): demand research for Matn

Scope: Hacker News (Algolia API, stories and comments since 2025-01-01), GitHub issues (anthropics/claude-code, openai/codex, microsoft/vscode, zed, joplin, glow, plannotator, crit, revdiff, leaf, QLMarkdown), the Cursor forum, the OpenAI community forum, the Obsidian forum, and blogs. Reddit was excluded because it is covered separately. Research date: 2026-11-05.

Weighting: the number of independent voices first, then votes (HN points, GitHub +1s, stars). "Voices" counts distinct people or projects found saying the same thing. It is a lower bound, not a census.

Caveat: X/Twitter is thin here. Web search does not surface tweets reliably. The only X signal found is second-hand (a Cloudflare engineer on X recommending Plannotator, per an HN comment, and secondary write-ups of Thariq Shihipar's "HTML" post).

---

## Ranked top 15 needs

| # | Need | Voices | Strongest vote signal |
|---|------|--------|-----------------------|
| 1 | Inline annotation on plans/docs, sent back to the agent | 25+ | Plannotator 9.9k stars; HN "Separation of planning and execution" 976 pts / 591 comments |
| 2 | Live reload when an agent rewrites the file | 12+ | VS Code #265277 (+32, 39 comments), VS Code #65258 (+51) |
| 3 | "What changed since I last read it" (diff of agent rewrites) | 10+ | Cursor forum diff-highlights request; MRDown; recurring HN comments |
| 4 | Open any .md instantly, with no vault or project, as the default handler | 15+ | Obsidian thread #314 (open since 2020); HN "A Markdown File Should Just Open" 64 pts / 85 comments |
| 5 | Folder/multi-repo view, plus "find the file my agent just wrote" | 10+ | Vantage, markdownlibrary, Marky, spec dirs in HN threads |
| 6 | Mermaid, LaTeX, GFM tables and alerts rendered correctly | 15+ | claude-code #16446 (+153), #65632 (+94), #14375 (+66), #52517 (+62); codex #8259 (+125) |
| 7 | Reading comfort: font size, line width, resizable panes, smooth scroll | 10+ | claude-code #34196 (+117), #11651 (+99), #101866, #57749 |
| 8 | RTL/BiDi that works with mixed English code, paths and identifiers | 20+ issues | VS Code #11770 (+310), #4994 (+230); Zed #31102 (+138); claude-code #38005 (+97), #16814 (+84) |
| 9 | Copy as Markdown, export, print/PDF, share | 10+ | codex #2880 (+78), claude-code #859 (+70), codex #25201 (+47), #54670 (+40), codex #10486 (+23) |
| 10 | Search across scattered agent .md files | 6+ | HN SmallDocs thread; Cursor "no copy or find in plan" |
| 11 | Hooks into the agent loop: auto-open on plan exit, approve/reject, structured feedback | 10+ | Plannotator #1116, #127, #570; Crit #196; revdiff |
| 12 | Native, light and fast (not Electron, not a 12 GB IDE) | 10+ | Marky "native" fight; Xcode hijacking .md; MDLight, Foglio, Scriptum, Ferrite (241 pts) |
| 13 | Quick Look / Finder preview | 6+ | QLMarkdown 3.7k stars; Looq; HN asks for "which QL extension?" |
| 14 | CLI `open` command and terminal/editor round-trip | 10+ | glow 28k stars; leaf 2.2k; Marky "no CLI in Obsidian"; claude-code Ctrl+G/editor issues |
| 15 | One-key rendered/raw toggle | 6+ | "Should Just Open" thread; Cursor Preview/Source toggle complaints |

---

## 1. Recurring pain points

**P1. Reading long agent plans in a terminal or chat pane is miserable.**
- "Reviewing agent output in a terminal is painful": Crit author, https://news.ycombinator.com/item?id=47322273
- "instead of approving a wall of text in the terminal": Plannotator author, https://news.ycombinator.com/item?id=48495970
- "I really hate reading plans in conversation UI": txhwind in "Plan mode is dead" (593 pts), https://news.ycombinator.com/item?id=49840054
- "I hate reading that walls of text the agent throws at me": https://news.ycombinator.com/item?id=50334078
- Marky (75 pts): "I spend more time reading markdown than code", https://news.ycombinator.com/item?id=47795468

**P2. Viewers don't refresh when the agent rewrites the file.**
- VS Code preview doesn't reload when the file is overwritten: #265277 (+32, 39 comments), https://github.com/microsoft/vscode/issues/265277. Agents tend to write files by replacing them, which is exactly this case.
- Images don't reload when changed by another tool: VS Code #65258 (+51), https://github.com/microsoft/vscode/issues/65258
- "with files getting continuously modified by coding agents, I want really good integration with git and live update": zmmmmm, https://news.ycombinator.com/item?id=47795468
- Scriptum markets live reload "when another program writes the file": https://news.ycombinator.com/item?id=49111558

**P3. Vaults and projects get in the way.**
- Obsidian: "opening a markdown file that did not live in a vault wasn't possible": Marky author, https://news.ycombinator.com/item?id=47795468
- Obsidian forum thread #314, open since May 2020, many pages long: https://forum.obsidian.md/t/have-obsidian-be-the-handler-of-md-files-add-ability-to-use-obsidian-as-a-markdown-editor-on-files-outside-vault-file-association/314
- Products now market "no vault" as a feature: MDLight (https://news.ycombinator.com/item?id=48684499), Foglio (https://news.ycombinator.com/item?id=49070933), markside (https://news.ycombinator.com/item?id=50192254)

**P4. Default-app chaos.**
- "Every time I install Xcode it decides that it's the default markdown reader": whh, and "Firing up a 12gb app to read markdown seems like overkill", https://news.ycombinator.com/item?id=50192254
- On Ubuntu, "I could only find about 3, and all sucked": the complaints were that the app doesn't remember position and forces a file-tree sidebar. Same thread.

**P5. Rendering gaps in agent tools themselves.** Mermaid, inline math and tables come up repeatedly:
- claude-code #52517 (+62) and #14375 (+66) for Mermaid; #65632 (+94), #65777 (+64) and #16446 (+153) for LaTeX
- codex #8259 (+125): "Format Markdown tables so that they are readable by humans"
- Cursor wants plan-style Mermaid in regular .md files: https://forum.cursor.com/t/feature-request-enable-plan-style-mermaid-rendering-for-regular-md-files/148067

**P6. Basic reading ergonomics are missing.**
- "First thing that blocks me... lack of ability to adjust text size", plus a request for resizable sidebars: alsetmusic, https://news.ycombinator.com/item?id=47795468
- Font size and family in the Claude Code VS Code chat: #34196 (+117), #11651 (+99)
- Rendered Markdown is "locked to a narrow fixed-width column while tables span full width": claude-code #101866, https://github.com/anthropics/claude-code/issues/101866
- "VS codes preview of markdown files scrolls very poorly on my Mac": sleazebreeze, Marky thread

**P7. Agent .md files pile up and can't be found later.**
- "I've got maybe 50 .md files scattered across different project directories from AI coding sessions… grep -r is all I've got": saadn92, https://news.ycombinator.com/item?id=47777633
- "find the 75th file your agent just wrote for you": Vantage author, Marky thread

---

## 2. Concrete feature wishes

- **Inline comments anchored to a line or section**, GitHub-PR style. Crit, Plannotator, revdiff, open-plan-annotator, md-redline (https://news.ycombinator.com/item?id=47656530), Markleft (https://news.ycombinator.com/item?id=49284329), planc (https://github.com/jakebf/planc) and a VS Code annotate plugin (https://news.ycombinator.com/item?id=47526021) all exist. That is about 8 independent tools for the same idea.
- **Persistent review threads.** "I'd be happy if plannotator would persist something similar to github PR reviews combined with Google docs comments & suggestions" (soleveloper, https://news.ycombinator.com/item?id=49840054). Committing to git loses the comments and their anchors.
- **Diff since last version, in green/red.** Cursor forum: https://forum.cursor.com/t/please-add-green-red-diff-highlights-to-plan-document/156122. MRDown: https://news.ycombinator.com/item?id=49563459. "compare the before and after versions" (dack, https://news.ycombinator.com/item?id=47106686).
- **Find and copy inside the plan view.** Cursor: https://forum.cursor.com/t/in-plan-preview-and-editor-no-copy-or-find/137079
- **Rendered/raw toggle that remembers its state** (jstsch, https://news.ycombinator.com/item?id=50192254). Cursor's Preview/Source switch is missing for `*.plan.md` files: https://forum.cursor.com/t/preview-markdown-toggle-in-agent-window-deprecated/165811
- **TOC/outline sidebar.** QLMarkdown #161; leaf; hattray's viewer (https://news.ycombinator.com/item?id=49514729)
- **Print/PDF of the rendered view.** "First class (free) printing support for rendered markdown seems like a lacuna" (msluyter, Marky thread). "Most loved feature… print/pdf the preview as-is" (shambo, https://news.ycombinator.com/item?id=49514729)
- **Copy as Markdown source.** codex #2880 (+78), #25201 (+47, "disappeared"); claude-code #859 (+70), #54670 (+40)
- **Share privately** with a link or encrypted fragment (SDocs, 92 pts, https://news.ycombinator.com/item?id=47777633), or share a plan with the team (Plannotator).
- **Frontmatter as structured state** (status, dependencies) rather than prose: fredericgalline, SDocs thread
- **Vim keys and keyboard navigation.** HN "Markdown CLI viewer with VI keybindings" (84 pts, https://news.ycombinator.com/item?id=46963865); crit #509; revdiff #138
- **Image paste into review comments**: crit #458

---

## 3. Agent-era workflows

**W1. Plan → annotate → send back → re-plan.** This is the dominant workflow.
- The HN post "How I use Claude Code: Separation of planning and execution" (976 pts, 591 comments, https://news.ycombinator.com/item?id=47106686) has the core loop: "Read deeply, write a plan, annotate the plan until it's right".
- Its friction point: "you can't annotate inline with planning mode. you have to type a lot to explain precisely what needs to change" (dack).
- Homemade conventions: `ME:` prefixes (srid), `TODOCLAUDE` markers then "Address all the TODOCLAUDEs" (red_hare thread), annotated ticket files (zitrusfrucht).
- Plannotator reached 9.9k stars in about 10 months (https://github.com/backnotprop/plannotator). Crit has 1.3k (https://github.com/tomasz-tomczyk/crit); one user reviews "5–10 plans/day" with it (https://news.ycombinator.com/item?id=48062402). revdiff has 945 (https://github.com/umputun/revdiff).
- Official tools are catching up. The Claude Code VS Code extension's plan mode "has supported select and annotate directly since at the very least early 2026", and "codex added the annotations too" (bartread and aymandfire, https://news.ycombinator.com/item?id=49840054).

**W2. Plans as files, not a mode.** Many people tell the agent to write `plan.md` and skip plan mode.
- Voices: brokencode, pseudosavant, notatoad, jeswin (spec *directories*), dmix ("multiple agents work on a markdown file which I manually perfect"), digitaltrees (`/agile/roadmap.md` + `epicN.md`), txhwind, all in https://news.ycombinator.com/item?id=49840054
- Implication: the reader must handle a folder of evolving plans and specs, not one plan blob.

**W3. Feedback goes back as a structured prompt.**
- Crit: "hit Finish, and a structured prompt goes to your clipboard" (https://news.ycombinator.com/item?id=47322273)
- Plannotator: annotations go "back into the agent session" through hooks
- Requests: continuous review with live updates and agent replies (Plannotator #1116, open, 16 reactions); approve/reject flow for spec frameworks (#570); "clear context + auto-accept" approval (#127, 19 reactions); Codex support (Crit #196)

**W4. Multi-agent / multi-session review.**
- "juggling parallel conversations with agents" (Crit author)
- "At times running 30 agents… Mostly paying attention to final reports, test results, claims" (tsmartin29, https://news.ycombinator.com/item?id=50334078). For heavy users, the thing worth reading is often the final report, not the plan.

**W5. Diffing agent edits to prose.** MRDown was built because "the thing I actually needed: read the diff of what the agent just rewrote" (https://news.ycombinator.com/item?id=49563459). Cursor and dack ask for the same.

**W6. Markdown or HTML for agent output?**
- "Using Claude Code: The unreasonable effectiveness of HTML" (528 pts, 274 comments, https://news.ycombinator.com/item?id=48071940). Simon Willison said it made him reconsider.
- Counterpoint in the same thread: Markdown is "better for when the human can see what the LLM has changed and iterate on it" (wek).
- Plannotator now renders and annotates HTML artifacts as well.

---

## 4. RTL-specific needs

**Volume.** RTL complaints are scattered but persistent, and almost all sit in agent and dev tools, not in standalone Markdown readers:
- Claude: #38005 (+97, 45 comments), #16814 (+84), #37183 (+37), #12635 (Persian)
- Codex: #19504 (+18, 22 comments), #14578 (+11, Persian), #31903 (Hebrew, macOS), #21563, #30129, #30414 (VS Code panel), #56981 (spreadsheet preview)
- VS Code: #11770 (+310, 193 comments), #4994 (+230), #83365 (+64, "Turn off RTL for syntactical characters in bidi lines"), #65648 (+43), #277736 (Persian in Copilot Chat), #277693 (bidi punctuation in Persian-English text)
- Others: Zed #31102 (+138), dear-github #147 (+72, RTL in GitHub comments), Joplin #3991 (since 2020), glow PR #923 (open since April 2026, terminal bidi reordering), OpenCode PR #32247 (full RTL, code blocks isolated LTR)

**Concrete RTL needs, as users state them:**
1. **Mixed-direction paragraphs are the norm.** "a single message often mixes Hebrew instructions with English identifiers, file paths, terminal output, Markdown, URLs, numbers, GitHub issue/PR references, and inline code" (codex #31903, https://github.com/openai/codex/issues/31903). Word order scrambles and periods land in the wrong place (claude-code #38005, https://github.com/anthropics/claude-code/issues/38005).
2. **Auto-detect direction per paragraph**, not per document (claude-code #16814, codex #19504).
3. **Code blocks and inline code stay LTR and isolated** (`unicode-bidi: isolate`): OpenCode PR #32247, claude-code #12635.
4. **Punctuation and brackets** must sit on the correct side: VS Code #277693, #83365; codex #14578.
5. **Alignment, list bullets and tables** follow the paragraph direction: codex #19504, Joplin #3991.
6. **Numbers in Arabic contexts.** UAX #9 W2 (digits after Arabic letters are classed as Arabic numbers) comes up in the HN "Rendering Arabic typography and its technical debt" thread (287 pts, https://news.ycombinator.com/item?id=48516710).
7. **The cognitive cost is real.** An article quoted in that thread describes bilingual senior engineers who "give up on writing a long email in Outlook… because the cursor would not behave" (samat).
8. **Arabic is the stress test.** "Arabic script is a great test to see if your terminal/renderer/UI can handle anything" (evilturnip, same thread).

**Gap.** No Markdown reader in this research markets correct BiDi for mixed developer text. One HN comment calls Typora the one with "probably best RTL support" (https://news.ycombinator.com/item?id=46717684), and it is an editor, not agent-focused.

---

## 5. Integration wishes

- **Terminal/CLI.** Open a file or folder with one command.
  - Marky's reason to leave Obsidian: "there was not a CLI that made it easy to quickly open files"
  - `mdr` command praised (https://news.ycombinator.com/item?id=50358137); `seams .`; leaf (2.2k stars) and glow (28k stars) for in-terminal viewing
  - Some users want everything to stay in the terminal (Shine, https://news.ycombinator.com/item?id=49649367; revdiff)
- **Editor round-trip.** Claude Code plan mode's external-editor path is buggy or inflexible: #52512 (Ctrl+G broken on Linux), #86924 (configurable editor), #69341, #75942 (JetBrains), #32758 (+10, keep plan inline).
- **Finder / Quick Look.** QLMarkdown has 3.7k stars (https://github.com/sbarex/QLMarkdown); its top requests are Mermaid (#162), a TOC sidebar (#161), GitHub alerts (#143) and math (#110). Looq (https://news.ycombinator.com/item?id=47467950). "Which Quick Look extension? I've been looking for a good one" (AndrewSwift, HTML thread).
- **Browser.** People want browsers to render .md natively (zahrevsky, captn3m0, comradesmith in https://news.ycombinator.com/item?id=50192254). Answers include extensions (markside) and PWAs that register as the .md file handler (https://news.ycombinator.com/item?id=49514729).
- **VS Code.** The baseline people compare against ("seems like vscode + preview is nearly the same?"), but with refresh bugs (#265277) and scroll jank. The top requests are old: auto-open preview (#2766, +90), preview in a new window (#32818, +98), back navigation (#92257, +80).
- **Obsidian.** Used by some as the agent-pairing viewer ("my typical go to for pairing with Agentic work", gknapp), but blocked by vaults.
- **Agent harnesses.** Hooks for Claude Code, OpenCode, Pi and Codex; sandbox-friendly remote mode (Plannotator in nono.sh, https://news.ycombinator.com/item?id=48495970).
- **Raycast/Alfred.** Weak signal: only the Obsidian forum's Alfred workarounds for opening files. No direct requests found.

---

## Surprising insights

1. **The viewer itself is a commodity; review is the moat.** About 30 "Show HN: Markdown viewer" posts appeared from 2025 to 2026. Almost all got under 10 points, and HN pushes back with comments like "stop making… damned Markdown viewers" (https://news.ycombinator.com/item?id=49397291) and "Seems like I'm just part of the club here". Meanwhile Plannotator, a review-and-feedback tool rather than a viewer, reached 9.9k stars. People pay attention to the feedback loop, not the rendering.
2. **People move to HTML because Quick Look renders HTML.** One user writes "I use HTML files rather than markdown… because… it's easier to use 'quick look' on HTML files than markdown" (https://news.ycombinator.com/item?id=48979723). Add the Claude Code team's HTML push, and a Markdown-only reader risks losing the agent-report use case. Rendering local agent HTML safely is a hedge.
3. **A growing group doesn't read plans at all.** "Plan mode is dead" (593 pts) and "Ask HN: Do you read your coding agent's plans?" show heavy users skipping plans and reading final reports, changelogs and test claims. Matn should treat reports and "what changed" summaries as first-class, not only plans. "Own Your Slop – A Markdown reader that confirms you read it" (https://news.ycombinator.com/item?id=49961839) points the same way: read receipts or progress as a feature.
4. **The main voice on RTL is Hebrew developers, then Persian, then Arabic.** Every issue is in agent chat surfaces, and none is fixed in Claude Desktop or Codex. A reader that gets BiDi right for mixed code-heavy text has essentially no competition.
5. **Comments must survive plan rewrites.** Users want comments tied to sections that persist across agent revisions, like PR reviews with resolve and outdated states. Today's tools mostly start from scratch each round: "When it updates the plan, you start over from scratch" (Crit, https://news.ycombinator.com/item?id=47322273).

---

## Sources (selected)
- HN Algolia: https://hn.algolia.com/api/v1/search
- Plannotator: https://github.com/backnotprop/plannotator · Crit: https://github.com/tomasz-tomczyk/crit · revdiff: https://github.com/umputun/revdiff
- Cursor forum: https://forum.cursor.com/t/please-add-green-red-diff-highlights-to-plan-document/156122 · https://forum.cursor.com/t/in-plan-preview-and-editor-no-copy-or-find/137079 · https://forum.cursor.com/t/markdown-build-plan-inconsistent-edit-preview-mode/158313
- OpenAI community: https://community.openai.com/t/feature-request-in-app-preview-for-markdown-files-in-codex-chatgpt-app/1388543 · https://community.openai.com/t/add-native-markdown-preview-in-the-codex-macos-app/1374638
- Obsidian forum: https://forum.obsidian.md/t/have-obsidian-be-the-handler-of-md-files-add-ability-to-use-obsidian-as-a-markdown-editor-on-files-outside-vault-file-association/314
- Plan viewers found by web search: https://github.com/bzon/spec-viewer · https://github.com/jakebf/planc
- HTML vs Markdown: https://news.ycombinator.com/item?id=48071940 · https://agentpatterns.ai/instructions/html-as-output-format/
