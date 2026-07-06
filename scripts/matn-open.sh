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

exec "$NODE_BIN" "$REPO/bin/matn.mjs" "$@"
