#!/usr/bin/env bash
# Screenshot the landing page and the app with headless Chromium.
#
#   scripts/shot.sh landing              -> docs/assets/landing-desktop.png  + -mobile.png
#   scripts/shot.sh app                  -> docs/assets/app-desktop.png      + -mobile.png
#   scripts/shot.sh app app-sonnet sonnet   (4th arg = a hash to open first)
#
# Look at the PNGs before committing them. A page that renders wrong is worse
# than no screenshot at all.
set -euo pipefail

KIND="${1:?usage: shot.sh <landing|app> [out-name] [hash]}"
NAME="${2:-$KIND}"
HASH="${3:-}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ "$KIND" = "app" ]; then
  PAGE="$ROOT/docs/play/index.html"
else
  PAGE="$ROOT/docs/index.html"
fi
[ -f "$PAGE" ] || { echo "no page at $PAGE"; exit 1; }

mkdir -p "$ROOT/docs/assets"
CHROME="$(command -v chromium || command -v chromium-browser || command -v google-chrome)"
URL="file://$PAGE"
[ -n "$HASH" ] && URL="$URL#/$HASH"

shot () { # $1 width  $2 outfile  $3 height
  "$CHROME" --headless --no-sandbox --disable-gpu --hide-scrollbars \
    --virtual-time-budget=6000 --window-size="$1,$3" --screenshot="$2" "$URL" >/dev/null 2>&1
  echo "wrote ${2#$ROOT/} ($(stat -c%s "$2") bytes)"
}

H=1650
[ "$KIND" = "app" ] && H=1000
shot 1280 "$ROOT/docs/assets/${NAME}-desktop.png" "$H"
shot 430  "$ROOT/docs/assets/${NAME}-mobile.png"  900
