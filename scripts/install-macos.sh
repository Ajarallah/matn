#!/usr/bin/env bash
# Build a macOS Finder app that opens .md files in Matn, and (optionally) make it
# the default handler for Markdown. Safe to re-run.
#
#   bash scripts/install-macos.sh            # build the app
#   bash scripts/install-macos.sh --default  # + set as default for .md (needs duti)
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP="$HOME/Applications/Matn.app"
BID="com.ajarallah.matn"
PB=/usr/libexec/PlistBuddy

echo "[matn] building $APP"
mkdir -p "$HOME/Applications"
TMP="$(mktemp -t matn-droplet).applescript"
cat > "$TMP" <<APPLE
property opener : "$REPO/scripts/matn-open.sh"
on open theFiles
	repeat with f in theFiles
		do shell script "/bin/bash " & quoted form of opener & " " & quoted form of (POSIX path of f)
	end repeat
end open
on run
	do shell script "/bin/bash " & quoted form of opener
end run
APPLE
rm -rf "$APP"
osacompile -o "$APP" "$TMP"
rm -f "$TMP"

# Declare Markdown document types + a stable bundle id.
PL="$APP/Contents/Info.plist"
$PB -c "Add :CFBundleIdentifier string $BID" "$PL" 2>/dev/null || $PB -c "Set :CFBundleIdentifier $BID" "$PL"
$PB -c "Add :CFBundleName string Matn" "$PL" 2>/dev/null || true
$PB -c "Delete :CFBundleDocumentTypes" "$PL" 2>/dev/null || true
$PB -c "Add :CFBundleDocumentTypes array" "$PL"
$PB -c "Add :CFBundleDocumentTypes:0 dict" "$PL"
$PB -c "Add :CFBundleDocumentTypes:0:CFBundleTypeName string Markdown" "$PL"
$PB -c "Add :CFBundleDocumentTypes:0:CFBundleTypeRole string Viewer" "$PL"
$PB -c "Add :CFBundleDocumentTypes:0:LSHandlerRank string Alternate" "$PL"
$PB -c "Add :CFBundleDocumentTypes:0:CFBundleTypeExtensions array" "$PL"
for i in 0:md 1:markdown 2:mdown 3:mkd; do
  $PB -c "Add :CFBundleDocumentTypes:0:CFBundleTypeExtensions:${i%%:*} string ${i##*:}" "$PL"
done
$PB -c "Add :CFBundleDocumentTypes:0:LSItemContentTypes array" "$PL"
$PB -c "Add :CFBundleDocumentTypes:0:LSItemContentTypes:0 string net.daringfireball.markdown" "$PL"

/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$APP"
echo "[matn] built. Drag a .md onto $APP, or right-click a file → Open With → Matn."

if [ "${1:-}" = "--default" ]; then
  if command -v duti >/dev/null 2>&1; then
    duti -s "$BID" net.daringfireball.markdown all && echo "[matn] set as default handler for .md"
  else
    echo "[matn] 'duti' not found. Install with: brew install duti"
    echo "[matn] then: duti -s $BID net.daringfireball.markdown all"
  fi
fi
