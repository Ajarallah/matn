# Agent integration — design

Status: approved in conversation 2026-11-05. Research behind it: [013-market-research-2026-11.md](../013-market-research-2026-11.md).

## Goal

A developer who works with Claude Code or Codex reads everything the agent writes in Matn, in correct Arabic, and talks back to the agent from there — without copying text between windows. Success is the full loop working end to end:

1. Claude leaves plan mode → the plan opens in Matn.
2. The reader comments, optionally suggests replacement text, and presses **Request changes** or **Approve**.
3. Claude receives the decision and the notes (quote, line, note, suggestion) and revises.
4. The revised plan opens showing what changed since the reviewed version, and every earlier note shows whether its text changed.

Plus: Claude's last reply renders in Matn on demand (`/matn:last`), agents can ask what the human changed since they last read a file, files the agent writes can open in the same tab, and the whole thing installs with one command and no npm.

## Units

Each unit is testable on its own; the CLI is the only interface the agents see.

### 1. Review decision (page + server + `annotation-core`)

- The review bar has two modes. `?review=<id>` alone: one **Send** button, as today. `?review=<id>&gate=1` (plan gate): **Request changes** and **Approve**.
- An annotation gains an optional `suggestion` (replacement text, up to 20,000 characters) entered under the note, and `sentAt` (set when the note is sent). `state-store.cleanAnnotation` keeps both.
- `reviewMarkdown` prints a suggestion as `Suggested replacement:` followed by the text in a quote block, and only includes notes without `sentAt`.
- `POST /api/review` body becomes `{id, markdown, decision}` with `decision` in `send | approve | changes`. On receipt the server records the file's on-disk text as the *seen* copy, so the next opening shows changes since the review. `GET /api/review-wait` returns JSON `{decision, markdown}`.
- After sending, the page stamps `sentAt` on the file's notes.

### 2. Revision view (page)

When a file opens with earlier, already-sent notes, each such note gets a status chip computed after the changes view is applied: **changed** (its block is marked edited or new, or the quote is gone) or **unchanged**. Unsent notes have no chip. No new storage: it reuses the seen copy, the block diff and the existing anchors.

### 3. Follow (server + CLI + page)

- `POST /api/follow {path}` broadcasts `{type:"follow", path}` on the existing `/api/events` stream and answers `{delivered: n}`. It accepts only requests with no `Origin` and no `Sec-Fetch-Site` header, which a browser page cannot send, and only paths inside the root.
- `matn <file>` reusing an instance first tries follow; it opens a browser tab only when no page is listening. This also ends the "new tab on every open" behaviour for everyone.
- The page loads the file on a follow event and shows a short toast.

### 4. CLI subcommands (`bin/matn.mjs`, logic in `src/agent.mjs`)

| Command | Does |
|---|---|
| `matn review FILE [--gate] [--json] [--timeout S]` | as today; `--gate` shows Approve / Request changes; `--json` prints `{decision, markdown}`; on timeout exits 3 with nothing on stdout |
| `matn changes FILE [--reader NAME] [--mark]` | prints added / edited / removed blocks since `NAME` (default `agent`) last marked the file; `--mark` records now. Exit 0 always; "No changes" when equal; first run says it has no earlier copy |
| `matn last` | opens the last saved agent reply |
| `matn agent [gate on\|off] [follow on\|off] [replies save\|arabic\|off]` | shows or sets options in `<dataDir>/agent.json`; defaults `gate on`, `follow off`, `replies save` |
| `matn hook plan-gate\|follow\|reply` | hook entry points: JSON on stdin, JSON on stdout |
| `matn setup codex` | installs the Matn skill to `~/.agents/skills/matn/SKILL.md` |

Per-reader seen copies reuse `state-store.writeSeen` with the key `<realpath>\0reader:<name>`.

### 5. Hooks (`src/agent.mjs`)

- **plan-gate** (`PermissionRequest`, matcher `ExitPlanMode`, hook timeout 1800s). Reads `tool_input.plan` and `tool_input.planFilePath`. If gate is off, prints nothing (normal dialog). Otherwise uses the plan file, or writes the plan text to a stdin-style temp session when there is no file, and runs the review with `gate` and an internal deadline of 1780s.
  - Approve: `{"hookSpecificOutput":{"hookEventName":"PermissionRequest","decision":{"behavior":"allow","updatedInput":<tool_input, with the notes appended to plan under "## Reviewer notes" when there are any>}}}`.
  - Request changes: `decision.behavior "deny"` with `message` = the review markdown plus one line asking Claude to revise the plan and call ExitPlanMode again.
  - Timeout or any error: print nothing, exit 0 — Claude Code falls back to its own dialog. A hook must never block the agent by failing.
- **follow** (`PostToolUse`, matcher `Write|Edit|MultiEdit`). If follow is on and `tool_input.file_path` is Markdown, spawns `matn <file>` detached. Never outputs anything.
- **reply** (`Stop`). Takes `last_assistant_message`, or the last assistant text in `transcript_path` when that field is absent. Saves it to `<dataDir>/replies/latest.md` (overwritten, one file). With `replies arabic`, also opens it when it is over 200 characters and at least 30% Arabic letters.

### 6. Claude Code plugin (repo root)

- `.claude-plugin/plugin.json` (`name: "matn"`), `.claude-plugin/marketplace.json` with one plugin whose `source` is `./`. Install: `claude plugin marketplace add Ajarallah/matn`, then `claude plugin install matn@matn`.
- `hooks/hooks.json` calls `node "${CLAUDE_PLUGIN_ROOT}/bin/matn.mjs" hook …`.
- `bin/matn` — a shell shim to `matn.mjs`, so the plugin puts `matn` on the agent's PATH.
- `commands/`: `open.md`, `review.md`, `last.md`, `changes.md` — thin prompts that run the CLI.
- `skills/matn/SKILL.md` — shared with Codex: when to ask for a review, how to read the notes, how to use `changes`.

### 7. Codex

Codex has hooks but no plan-approval event, so it gets the skill (via `matn setup codex`), which tells it to write plans and reports to files and call `matn review FILE` before acting on them.

## Errors and safety

- Hooks fail open: any exception prints nothing and exits 0.
- Review and follow keep Matn's containment: follow paths must be inside the instance root; review of a file outside the root starts its own contained instance, as today.
- `/api/follow` cannot be driven by a web page (no Origin rule); the write routes keep the session token and origin checks unchanged.
- Saved replies stay on the machine in the app-data folder, one file, overwritten.

## Testing

- Unit (`node --test`): suggestion and `sentAt` in `reviewMarkdown` and `cleanAnnotation`; plan-gate output for approve, changes and timeout; reply extraction from a transcript sample; Arabic-share rule; `changes` report; agent options.
- Server: review decision JSON round trip and seen-copy write; follow accepted without Origin, rejected with Origin, rejected outside the root.
- e2e (Playwright): gate buttons, suggestion field, `sentAt` stops a resend, status chips after a revision, follow event loads the file.
- Live: `claude plugin validate .` if available; run the plan-gate hook with a real Claude Code payload against a running Matn, and click through both decisions in the browser.

## Out of scope

MCP server, word diff inside blocks, j/k stepping, notes export, share links, VS Code, Mac app — each is listed with its order in the research file.
