# Contributing to Matn

Matn is a local Markdown reader for Arabic. It has no runtime dependencies and no
build step, which is a constraint worth protecting — it is why `npm i -g` takes a
second and why the reader works offline.

## Running it

```bash
git clone https://github.com/Ajarallah/matn.git
cd matn && npm install && npm link
matn README.md
```

`npm install` only fetches Playwright, used by the browser tests. The reader itself
runs on Node 18+ with nothing else.

## Before you open a pull request

```bash
npm test              # unit tests for the server, state store, and pure cores
npm run check         # syntax check on every entry point
npm run test:e2e      # Playwright: reading surface, selection, navigation, RTL
node scripts/build-docs.mjs   # regenerate docs/ if you touched src/
```

CI runs all four plus `npm pack --dry-run`. It also fails if `docs/` drifts from
`src/`, so run the build script when the reader changes.

## What tends to get rejected

- **A runtime dependency.** Vendored, licence-compatible assets in `vendor/` are
  fine; a `dependencies` entry is not.
- **Editing features.** Matn reads Markdown. It does not write it, and it never
  modifies the files you open.
- **Network calls.** Nothing in the reader may reach outside the machine.
- **Widening the file root.** The server serves Markdown and referenced images from
  the directory you opened, and nowhere else. See [SECURITY.md](../SECURITY.md).

## Things worth knowing

- **Direction is decided per document, not per line.** A file that is mostly Arabic
  stays right-to-left even when a heading starts with an English word. That is the
  central behaviour; changes near `stampDir` and `voteDir` need a test.
- **The pure cores are testable without a browser.** Rendering, search, links,
  book parsing, and annotations live in `src/*-core.cjs` as UMD modules that load
  in both Node and the page. Put logic there rather than in `index.html`.
- **Anything with a branch, a loop, or a security boundary leaves a test behind.**

## Reporting a security issue

Please use GitHub's private vulnerability reporting rather than a public issue.
See [SECURITY.md](../SECURITY.md).
