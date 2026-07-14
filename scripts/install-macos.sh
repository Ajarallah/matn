#!/usr/bin/env bash
# Build a macOS Finder app that opens .md files in Matn, and (optionally) make it
# the default handler for Markdown. Safe to re-run.
#
#   bash scripts/install-macos.sh                       # build the app
#   bash scripts/install-macos.sh --default             # + set as default for .md (needs duti)
#   bash scripts/install-macos.sh --agents              # + Codex Open in + Claude Code skill
#   bash scripts/install-macos.sh --default --agents    # all integrations
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP="$HOME/Applications/Matn.app"
BID="com.ajarallah.matn"
PB=/usr/libexec/PlistBuddy
MAKE_DEFAULT=false
INSTALL_CODEX=false
INSTALL_CLAUDE=false

for arg in "$@"; do
  case "$arg" in
    --default) MAKE_DEFAULT=true ;;
    --codex) INSTALL_CODEX=true ;;
    --claude) INSTALL_CLAUDE=true ;;
    --agents) INSTALL_CODEX=true; INSTALL_CLAUDE=true ;;
    --help|-h)
      echo "Usage: bash scripts/install-macos.sh [--default] [--codex] [--claude] [--agents]"
      exit 0
      ;;
    *)
      echo "[matn] unknown option: $arg" >&2
      exit 2
      ;;
  esac
done

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

install -m 0644 "$REPO/assets/matn-app-icon.svg" "$APP/Contents/Resources/matn-app-icon.svg"

# Declare Markdown document types + a stable bundle id.
PL="$APP/Contents/Info.plist"
$PB -c "Add :CFBundleIdentifier string $BID" "$PL" 2>/dev/null || $PB -c "Set :CFBundleIdentifier $BID" "$PL"
$PB -c "Add :CFBundleName string Matn" "$PL" 2>/dev/null || true
$PB -c "Add :CFBundleDisplayName string Matn" "$PL" 2>/dev/null || $PB -c "Set :CFBundleDisplayName Matn" "$PL"
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

if $INSTALL_CODEX; then
  node "$REPO/scripts/configure-codex-open-in.mjs" --app "$APP"
  echo "[matn] restart Codex once if Matn is not immediately visible under Open in."
fi

if $INSTALL_CLAUDE; then
  CLAUDE_SKILL="$HOME/.claude/skills/matn-open"
  mkdir -p "$CLAUDE_SKILL"
  install -m 0644 "$REPO/.claude/skills/matn-open/SKILL.md" "$CLAUDE_SKILL/SKILL.md"
  echo "[matn] installed Claude Code skill: /matn-open"
fi

if $MAKE_DEFAULT; then
  if command -v duti >/dev/null 2>&1; then
    duti -s "$BID" net.daringfireball.markdown all && echo "[matn] set as default handler for .md"
  else
    echo "[matn] 'duti' not found. Install with: brew install duti"
    echo "[matn] then: duti -s $BID net.daringfireball.markdown all"
  fi
fi
