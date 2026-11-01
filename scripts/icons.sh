#!/usr/bin/env bash
# Render the icon set from docs/icon.svg, locally, with headless Chromium.
#
#   bash scripts/icons.sh
#
# Nothing is fetched: the SVG in this repo is the only source, and the PNGs land
# in docs/assets/ so the manifest, the release and the landing page all point at
# the same files. A maskable variant is drawn full-bleed with the glyph inside
# the 80% safe zone, because Android crops and shapes whatever it is given.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/docs/assets"
SVG="$ROOT/docs/icon.svg"
CHROME="$(command -v chromium || command -v chromium-browser || command -v google-chrome)"
[ -f "$SVG" ] || { echo "no icon at $SVG"; exit 1; }
mkdir -p "$OUT"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

page () { # $1 size  $2 out html
  printf '%s' "$2" > "$1"
}

render () { # $1 html  $2 size  $3 outfile
  "$CHROME" --headless --no-sandbox --disable-gpu --hide-scrollbars \
    --default-background-color=00000000 --window-size="$2,$2" \
    --screenshot="$3" "file://$1" >/dev/null 2>&1
  echo "wrote ${3#$ROOT/} ($(stat -c%s "$3") bytes)"
}

plain () { # size -> html
  cat <<HTML
<!doctype html><html><body style="margin:0;background:transparent">
<img src="file://$SVG" width="$1" height="$1" style="display:block">
</body></html>
HTML
}

maskable () { # size -> html, full-bleed ground, glyph at 62% (inside the safe zone)
  local s="$1" g
  g=$(( s * 62 / 100 ))
  cat <<HTML
<!doctype html><html><body style="margin:0;background:#e11d48;width:${s}px;height:${s}px;
display:flex;align-items:center;justify-content:center;overflow:hidden">
<img src="file://$SVG" width="$g" height="$g" style="display:block;background:#e11d48">
</body></html>
HTML
}

for size in 16 32 48 180 192 512; do
  page "$TMP/p$size.html" "$(plain "$size")"
  render "$TMP/p$size.html" "$size" "$OUT/icon-$size.png"
done

page "$TMP/m512.html" "$(maskable 512)"
render "$TMP/m512.html" 512 "$OUT/icon-maskable-512.png"
