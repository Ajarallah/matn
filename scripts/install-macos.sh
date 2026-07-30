#!/usr/bin/env bash
# Register Matn as a macOS Markdown viewer: build a small Finder app, declare the
# Markdown document types, and optionally make it the default handler.
#
#   bash install-macos.sh              build the app and register it
#   bash install-macos.sh --default    ... and open .md with Matn on double-click
#   bash install-macos.sh --uninstall  remove the app and hand .md back
#
# Works from a cloned repo or a global npm install. Safe to re-run.
set -euo pipefail

PKG="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP="$HOME/Applications/Matn.app"
BID="com.ajarallah.matn"
UTI="net.daringfireball.markdown"
PB=/usr/libexec/PlistBuddy
LSREGISTER=/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister
EXTENSIONS=(md markdown mdown mkdn mkd mdwn mdtxt mdtext rmd qmd)

say() { printf '[matn] %s\n' "$1"; }
die() { printf '[matn] %s\n' "$1" >&2; exit 1; }

if [ "${1:-}" = "--uninstall" ]; then
  if [ -e "$APP" ]; then
    "$LSREGISTER" -u "$APP" >/dev/null 2>&1 || true
    /bin/mv "$APP" "$HOME/.Trash/Matn.app.$$"
    say "moved Matn.app to the Trash — macOS falls back to your previous Markdown app"
  else
    say "no Matn.app to remove"
  fi
  exit 0
fi

[ "$(uname -s)" = "Darwin" ] || die "this installer is macOS-only; use install-linux.sh"
[ -f "$PKG/scripts/matn-open.sh" ] || die "matn-open.sh is missing next to this script — incomplete install?"
command -v node >/dev/null 2>&1 || die "Node.js 18 or newer is required: https://nodejs.org"

say "building $APP"
mkdir -p "$HOME/Applications"
DROPLET="$(mktemp -t matn-droplet).applescript"
trap 'rm -f "$DROPLET"' EXIT
cat > "$DROPLET" <<APPLE
property opener : "$PKG/scripts/matn-open.sh"
on open theFiles
	repeat with f in theFiles
		do shell script "/bin/bash " & quoted form of opener & " " & quoted form of (POSIX path of f)
	end repeat
end open
on run
	do shell script "/bin/bash " & quoted form of opener
end run
APPLE
# replace an older build without ever hard-deleting from the user's Applications
[ -e "$APP" ] && /bin/mv "$APP" "$HOME/.Trash/Matn.app.$$" 2>/dev/null || true
osacompile -o "$APP" "$DROPLET"

# Declare a stable identity and every Markdown extension the reader opens.
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
index=0
for ext in "${EXTENSIONS[@]}"; do
  $PB -c "Add :CFBundleDocumentTypes:0:CFBundleTypeExtensions:$index string $ext" "$PL"
  index=$((index + 1))
done
$PB -c "Add :CFBundleDocumentTypes:0:LSItemContentTypes array" "$PL"
$PB -c "Add :CFBundleDocumentTypes:0:LSItemContentTypes:0 string $UTI" "$PL"

"$LSREGISTER" -f "$APP"
say "registered — right-click any .md → Open With → Matn"

if [ "${1:-}" != "--default" ]; then
  say "re-run with --default to open Markdown in Matn on double-click"
  exit 0
fi

# Claiming the Markdown type is one LaunchServices call. duti is the usual tool but
# needs Homebrew; the same call is one line of Swift, which ships with the Xcode
# command line tools. Try both before asking the reader to install anything.
set_default() {
  if command -v duti >/dev/null 2>&1 && duti -s "$BID" "$UTI" all 2>/dev/null; then
    say "Matn now opens Markdown on double-click (via duti)"; return 0
  fi
  if command -v swift >/dev/null 2>&1 && swift - >/dev/null 2>&1 <<SWIFT
import Foundation
import CoreServices
LSSetDefaultRoleHandlerForContentType("$UTI" as CFString, .all, "$BID" as CFString)
SWIFT
  then
    say "Matn now opens Markdown on double-click (via LaunchServices)"; return 0
  fi
  return 1
}

if ! set_default; then
  cat >&2 <<GUIDE
[matn] could not claim the Markdown type automatically. Either works:

  1. No extra tools — in Finder, select any .md file,
     File → Get Info → "Open with:" → Matn → Change All…

  2. Install duti once, then re-run this installer with --default:
     brew install duti

GUIDE
  exit 1
fi
