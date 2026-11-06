---
name: matn-open
description: Open a Markdown file or a folder of Markdown files in the local Matn reader. Use when the user asks to open, preview, read, or browse Markdown (`.md`, `.markdown`, `.mdc`, `.mdx`, `.qmd`, `.rmd` and the other extensions in `src/markdown-files.cjs`) in Matn while working in this repository.
---

# Open in Matn

1. Resolve the requested file or folder relative to the current project directory. If no path is provided, use the current Markdown file when unambiguous; otherwise use the project directory.
2. Confirm the target exists. Accept directories and Markdown files only.
3. From the Matn project root, run:

```bash
bash scripts/matn-open.sh "<absolute-target>"
```

4. Report the opened absolute path. Do not wait for the Matn server; the launcher detaches it and reuses a compatible running instance.

Never modify the Markdown file as part of opening it. Opening files automatically is the plugin's opt-in `follow` setting (`matn agent follow on`), not this skill's job.
