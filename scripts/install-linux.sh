#!/usr/bin/env bash
# Register Matn as a Linux app that opens .md files, and (optionally) make it the
# default handler for Markdown. Safe to re-run.
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APPS="$HOME/.local/share/applications"
mkdir -p "$APPS"
cat > "$APPS/matn.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Matn
Comment=RTL Arabic Markdown reader
Exec=$REPO/scripts/matn-open.sh %f
Terminal=false
MimeType=text/markdown;
Categories=Utility;TextTools;
EOF
chmod +x "$REPO/scripts/matn-open.sh"
update-desktop-database "$APPS" 2>/dev/null || true
if [ "${1:-}" = "--default" ]; then
  xdg-mime default matn.desktop text/markdown 2>/dev/null && echo "[matn] set as default for text/markdown" || true
fi
echo "[matn] installed $APPS/matn.desktop — right-click a .md → Open With → Matn."
