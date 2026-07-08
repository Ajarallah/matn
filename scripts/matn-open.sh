#!/usr/bin/env bash
# Open a .md file (or folder) in Matn. Resolves Node even without a login PATH,
# so it works when called from a Finder droplet (`do shell script`).
# Usage: matn-open.sh [/abs/file.md | /abs/folder]
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

NODE_BIN="$(command -v node 2>/dev/null || true)"
if [ -z "$NODE_BIN" ]; then
  for d in "$HOME"/.nvm/versions/node/*/bin /opt/homebrew/bin /usr/local/bin; do
    [ -x "$d/node" ] && NODE_BIN="$d/node" && break
  done
fi
[ -z "$NODE_BIN" ] && { echo "Node.js not found"; exit 1; }

# matn runs a persistent server that never returns. When this script is called
# from the Finder droplet via AppleScript `do shell script`, that call BLOCKS
# until the command finishes — so the app hangs and ignores every later
# double-click until AppleScript's 120s timeout. Launch matn detached in the
# background so this script returns immediately and the droplet stays responsive.
# matn opens the browser itself and reuses/creates the right instance.
LOG="${TMPDIR:-/tmp}/matn.log"
nohup "$NODE_BIN" "$REPO/bin/matn.mjs" "$@" >>"$LOG" 2>&1 &
disown 2>/dev/null || true
exit 0
