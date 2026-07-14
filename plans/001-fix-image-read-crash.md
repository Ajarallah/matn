# Plan 001: An unreadable in-root image returns 404 instead of crashing the whole server

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving on. If a "STOP condition" occurs, stop and report — do not improvise. When done, update this plan's row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 0046350..HEAD -- src/server.mjs test/server.test.mjs`
> If either file changed since this plan was written, compare the "Current state" excerpt below against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status
- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `0046350`, 2026-07-08

## Why this matters

Matn's HTTP request handler reads referenced images with `readFileSync` **without a try/catch**. `safeImage` validates the path with `statSync(...).isFile()`, but the read can still throw afterwards — the file may be unreadable (EACCES: a regular file the user has no read permission for), or deleted/replaced between the stat and the read. A thrown exception inside a Node HTTP request listener is **not** caught by the server; it becomes an `uncaughtException` and **terminates the whole process**, dropping every connected reader. Every other file-serving branch in this file already guards its read; this one is the lone exception. One unreadable in-root image request kills the server.

## Current state

- `src/server.mjs` — the single-file HTTP server. The image branch is **unguarded**:

```js
// src/server.mjs:150-151
    const image = safeImage(u.pathname);
    if (image) return send(200, image.type, readFileSync(image.abs), { "cache-control": "no-store" });
```

- The **pattern to match** is the sibling `/api/raw` branch a few lines below, which guards the identical read and returns 404 on failure:

```js
// src/server.mjs:162-168
    if (u.pathname === "/api/raw") {
      const abs = safeMd(u.searchParams.get("path"));
      if (!abs) return send(400, "text/plain", "bad file");
      ensureWatch(dirname(abs));
      try { return send(200, "text/plain; charset=utf-8", readFileSync(abs, "utf8")); }
      catch { return send(404, "text/plain", "not found"); }
    }
```

- `readFileSync` is imported at `src/server.mjs:5`. `send` is a local helper defined at `src/server.mjs:108-109`.
- Existing tests live in `test/server.test.mjs` and use `node:test` + `node:assert/strict`, starting a server with `startServer({ port: 0, host: "127.0.0.1", defaultArg: root })`. The first test already fetches an in-root image (`/assets/pixel.png`) and asserts 200 — model the new test on it.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Drift check | `git diff --stat 0046350..HEAD -- src/server.mjs test/server.test.mjs` | (ideally empty) |
| Tests | `npm test` | all pass, including the new one |
| Syntax | `node --check src/server.mjs` | exit 0, no output |

## Scope

**In scope** (only files you may modify):
- `src/server.mjs`
- `test/server.test.mjs`

**Out of scope** (do NOT touch):
- `src/index.html`, `docs/` — this is a server-only fix; no client change, no docs rebuild.
- `safeImage` itself — its validation is correct; do not change it. The bug is only the missing guard around the read.

## Git workflow
- Branch: `advisor/001-fix-image-read-crash`
- One commit; message style like the repo, e.g. `fix: guard image read so an unreadable file returns 404, not a crash`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Wrap the image read in try/catch

In `src/server.mjs`, replace the unguarded image branch (lines 150-151) with a guarded version that returns 404 on read failure, mirroring `/api/raw`:

```js
    const image = safeImage(u.pathname);
    if (image) {
      try { return send(200, image.type, readFileSync(image.abs), { "cache-control": "no-store" }); }
      catch { return send(404, "text/plain", "nf"); }
    }
```

**Verify**: `node --check src/server.mjs` → exit 0. And `grep -n "catch" src/server.mjs` shows a catch now adjacent to the image `readFileSync` (line ~151).

### Step 2: Add a regression test

In `test/server.test.mjs`, add a new `test(...)` block (after the existing tests). It must:
1. Create a temp root dir; write a valid in-root image (`assets/ok.png`) and confirm it serves 200 (happy path still works).
2. Best-effort unreadable case (Unix only): write `assets/locked.png`, `chmod(…, 0o000)`, request it, and assert the response status is **404** and — critically — that a **second** request to the happy-path image still returns **200** (proves the server did not crash). Guard this half with `if (process.platform !== "win32" && (process.getuid?.() ?? 1) !== 0)` and skip otherwise; restore perms in cleanup so `rm` works.

Model structure on the first test in the file (temp dir via `mkdtemp`, `startServer({port:0,...})`, `t.after` cleanup, `fetch(base + path)`). Use `import { chmod } from "node:fs/promises"`.

**Verify**: `npm test` → all pass; the new test runs (not silently skipped on macOS/Linux as a non-root user).

## Test plan
- New test in `test/server.test.mjs`: (a) valid in-root image → 200; (b) unreadable in-root image → 404 AND the server still answers a subsequent request with 200 (crash-regression guard). Pattern: the existing "file API only serves markdown under the configured root" test.
- Verification: `npm test` → all pass, 1 new test.

## Done criteria (ALL must hold)
- [ ] `node --check src/server.mjs` exits 0
- [ ] `npm test` exits 0; the new image-read test exists and passes
- [ ] The image branch in `src/server.mjs` is wrapped in try/catch (verify: the `readFileSync(image.abs...)` call sits inside a `try { ... } catch { ... }`)
- [ ] No files outside the in-scope list changed (`git status`)
- [ ] `plans/README.md` status row for 001 updated to DONE

## STOP conditions (stop and report, do not improvise)
- The excerpt at `src/server.mjs:150-151` doesn't match the live code (drift).
- On this platform the unreadable-file test can't be made deterministic — keep the happy-path assertion, mark the unreadable half skipped with a clear reason, and report it (do not delete the whole test).
- `npm test` fails twice after a reasonable fix attempt.

## Maintenance notes
- If future code adds more direct `readFileSync`/`readFile` calls inside the request handler, they need the same guard — an unguarded synchronous throw in the listener crashes the process.
- A reviewer should confirm the catch returns a response (so the request doesn't hang) and does not leak the filesystem path in the body.
