---
description: Ask the user to review a Markdown file in Matn, then act on their notes
argument-hint: "<file>"
allowed-tools: Bash(matn:*)
---
Run `matn review $ARGUMENTS` with the Bash tool and a timeout of 600000 ms. If no file was given, use the plan, spec or report you wrote most recently in this session. The command opens the file in Matn and waits; when the user presses "Send to agent" it prints their notes as Markdown: each note quotes the text it is about, gives its line, and may carry a suggested replacement. If it ends with exit code 3 and no notes, nobody answered: either the timeout passed (run it again; the page stays open) or the user closed the page without deciding, which the command reports as "the review page was closed". In that case ask the user in one line whether to open it again, instead of reopening it unasked.

Then address every note: apply suggested replacements unless they conflict with something else the user asked for, and say in one line per note what you changed or why you didn't.
