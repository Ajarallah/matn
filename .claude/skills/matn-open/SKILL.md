---
name: matn-open
description: Open a Markdown file or a folder of Markdown files in the local Matn reader. Use when the user asks to open, preview, read, or browse `.md`, `.markdown`, `.mdown`, or `.mkd` content in Matn from Claude Code.
---

# Open in Matn

1. Resolve the requested file or folder relative to the current project directory. If no path is provided, use the current Markdown file when unambiguous; otherwise use the project directory.
2. Confirm the target exists. Accept directories and Markdown files only.
3. On macOS, prefer the registered Matn application:

```bash
/usr/bin/open -b com.ajarallah.matn "<absolute-target>"
```

   On other systems, or when the macOS application is not installed, run:

```bash
matn "<absolute-target>"
```

4. Report the opened absolute path. Do not wait for the Matn server; the launcher detaches it and reuses a compatible running instance.

Never modify the Markdown file as part of opening it. Do not add an automatic hook that opens every Markdown file Claude reads.
