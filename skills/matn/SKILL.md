---
name: matn
description: Hand Markdown to the user through Matn, a local reader that renders Arabic and mixed right-to-left text correctly, and get their review back. Use when you have written a plan, spec, design or report the user should read or approve before you act on it; when the user writes in Arabic and your answer is long; when the user asks to open, preview, read or review a .md file; or when you need to know what the user changed in a file since you last read it.
---

# Matn

`matn` is a command-line reader. Everything below runs with your shell tool.

## Ask for a review before acting on a plan

When you write a plan, spec or report the user should check, save it as a Markdown file and run:

```sh
matn review PATH.md
```

It opens the file in the reader and waits. Give the command a long timeout (10 minutes or more); if it times out, run it again — the page stays open. When the user presses "Send to agent", it prints their notes and exits 0. Exit 3 means `--timeout` passed with no answer.

Each note looks like this:

```markdown
## 2. Line 14, under "Rollout"

> Deploy to all regions at once.

Do one region first and watch errors for a day.

Suggested replacement:

> Deploy to one region, then the rest after 24 hours without new errors.
```

Address every note. Apply a suggested replacement unless it conflicts with something else the user asked for. Then say, in one line per note, what you changed or why you didn't.

Options:

- `--gate` shows Approve and Request changes instead of a single Send button.
- `--json` prints `{"decision": "approve" | "changes" | "send", "markdown": "..."}`. With `approve`, go ahead; with `changes`, revise and ask again.

## See what the user changed

```sh
matn changes PATH.md --mark
```

This lists the blocks added, edited and removed since you last ran it with `--mark`, and then records the file as read. Run it before you rework a file the user may have edited. The first run says there is no earlier copy.

## Show something to read

- `matn PATH.md` opens a file. If a Matn page is already open, it shows the file there instead of in a new tab.
- `matn last` opens your previous reply. This needs the Claude Code plugin, which saves each reply; use it when the user writes in Arabic, since many terminals and chat panels render Arabic wrongly.
- `printf '%s' "$TEXT" | matn - --stdin-name answer.md` shows Markdown that isn't in a file.

## Settings (Claude Code plugin)

`matn agent` shows the current settings; `matn agent gate off` turns them off one at a time.

- `gate on|off`: plan mode opens the plan in Matn for approval. Default on.
- `follow on|off`: every Markdown file you write opens in Matn. Default off.
- `replies save|arabic|off`: `save` keeps your last reply for `matn last`; `arabic` also opens long Arabic replies automatically. Default save.
