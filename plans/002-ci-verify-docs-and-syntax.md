# Plan 002: CI fails when the published demo drifts from source or when a script has a syntax error

> **Executor instructions**: Follow step by step, run every verification command, honor STOP conditions, and update this plan's row in `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat 0046350..HEAD -- .github/workflows/ci.yml package.json scripts/build-docs.mjs`
> On any change to those files since this plan was written, compare the excerpts below against the live code before proceeding; on a mismatch, STOP.

## Status
- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `0046350`, 2026-07-08

## Why this matters

The public GitHub Pages demo (`docs/`) is a full copy of the reader, regenerated from `src/index.html` by `scripts/build-docs.mjs`. Nothing enforces that `docs/` is up to date: a change to `src/index.html` that isn't followed by a manual rebuild **silently desyncs the live demo from the shipped reader**, and a routine reword of the markup that `build-docs.mjs` anchors on breaks the build with no CI signal. Separately, there is no syntax gate at all — a typo in `server.mjs`/`bin/matn.mjs`/`build-docs.mjs` is only discovered at runtime. Both are caught for free by `node`'s built-in tools (no new dependency), matching the project's zero-deps ethos.

## Current state

- `.github/workflows/ci.yml` runs only tests + a pack dry-run:

```yaml
# .github/workflows/ci.yml (the job's steps)
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm test
      - run: npm pack --dry-run
```

- `package.json` scripts today (no `check`):

```json
  "scripts": {
    "start": "node bin/matn.mjs",
    "test": "node --test"
  },
```

- `scripts/build-docs.mjs` writes `docs/index.html` and copies vendored assets into `docs/vendor/`; it prints `build-docs: ok` on success and `process.exit(1)` if its text anchors are missing. Running it must leave the git tree clean **if** `docs/` was already in sync.
- The three checkable Node scripts are `bin/matn.mjs`, `src/server.mjs`, `scripts/build-docs.mjs`. (The app JS inside `src/index.html` is inline HTML and cannot be `node --check`ed yet — plan 003 extracts it; see maintenance note.)

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Syntax gate | `npm run check` (after step 1) | exit 0, no errors |
| Docs-drift gate | `node scripts/build-docs.mjs && git diff --exit-code -- docs/` | `build-docs: ok`, then exit 0 (no diff) |
| Tests | `npm test` | all pass |

## Scope

**In scope**:
- `package.json` (add one script)
- `.github/workflows/ci.yml` (add steps)

**Out of scope**:
- `scripts/build-docs.mjs` — do not change the build logic in this plan (replacing its fragile text anchors with marker comments is a separate future improvement).
- `docs/` — do not hand-edit; it is generated.

## Git workflow
- Branch: `advisor/002-ci-verify-docs-and-syntax`
- One commit, e.g. `ci: verify demo is in sync with source and gate script syntax`.
- Do NOT push/PR unless instructed.

## Steps

### Step 1: Add a zero-dependency `check` script

In `package.json`, add a `check` script that syntax-checks the three Node scripts:

```json
  "scripts": {
    "start": "node bin/matn.mjs",
    "test": "node --test",
    "check": "node --check bin/matn.mjs && node --check src/server.mjs && node --check scripts/build-docs.mjs"
  },
```

**Verify**: `npm run check` → exit 0, no output.

### Step 2: Add CI steps for syntax and demo-drift

In `.github/workflows/ci.yml`, add two steps to the job (after `npm test`, keeping `npm pack --dry-run`):

```yaml
      - run: npm run check
      - run: node scripts/build-docs.mjs && git diff --exit-code -- docs/
```

The second step rebuilds the demo and fails the job if it produces any change to `docs/` (i.e. the committed `docs/` was stale).

**Verify locally** (simulating CI):
- `npm run check` → exit 0.
- `node scripts/build-docs.mjs && git diff --exit-code -- docs/` → prints `build-docs: ok`, exit 0. (If this shows a diff, `docs/` was already stale — see STOP conditions.)

### Step 3: Confirm the whole gate passes

**Verify**: run all three in sequence — `npm test && npm run check && node scripts/build-docs.mjs && git diff --exit-code -- docs/` → every command exits 0.

## Test plan
- No unit tests to add; the CI steps ARE the verification. Prove them locally per Step 2/3.

## Done criteria (ALL must hold)
- [ ] `npm run check` exits 0
- [ ] `node scripts/build-docs.mjs && git diff --exit-code -- docs/` exits 0 (demo in sync)
- [ ] `.github/workflows/ci.yml` contains both new steps (`npm run check`; the build+diff step)
- [ ] `npm test` still exits 0
- [ ] No files outside the in-scope list changed except a possible in-sync `docs/` rebuild (if the rebuild changed `docs/`, that is a STOP condition, not a commit)
- [ ] `plans/README.md` status row for 002 updated to DONE

## STOP conditions (stop and report)
- Step 2's `git diff --exit-code -- docs/` shows a diff **before** you changed anything: `docs/` is already out of sync with `src/index.html`. Do NOT silently commit the regenerated `docs/` here — report it so it can be handled as its own change (it means an earlier `src/index.html` edit skipped the rebuild).
- `build-docs.mjs` exits 1 (its text anchors no longer match the markup) — report; that is the fragile-anchor problem this plan intentionally leaves for a follow-up.

## Maintenance notes
- After **plan 003** extracts the app JS into `src/render-core.cjs`, add `&& node --check src/render-core.cjs` to the `check` script so the render pipeline is syntax-gated too.
- A future improvement (not this plan): replace `build-docs.mjs`'s exact-text anchors (`build-docs.mjs:23-26`, `:39-42`) with explicit `<!-- build:… -->` marker comments in `src/index.html`, so reflowing the markup can't break the build.
