#!/usr/bin/env bash
# scripts/release-notes.sh — give the rolling release a face.
#
#   bash scripts/release-notes.sh --dry-run     # print the body, change nothing
#   bash scripts/release-notes.sh               # rewrite the release body
#
# The pipeline publishes three builds and then describes them in one sentence.
# This replaces that sentence with the thing a person downloading needs: the app's
# own icon, which file is for which machine, how big it is, and the SHA-256 to
# check it against. Everything is read back from the release that was just
# published, so the page cannot describe a build that is not there.
#
# No dependencies beyond gh and coreutils. MIT. (c) 2026 Dr Sohil Momin.
set -euo pipefail

TAG="${RELEASE_TAG:-app-latest}"
APP="${APP_NAME:-app-poets-studio}"
REPO="${GITHUB_REPOSITORY:-drsamonline/app-poets-studio}"
MODE="${1:-}"

# raw.githubusercontent, not an image service: the icon and the badges are files
# in this repository, and a release page that needs a third party to draw its own
# icon is the wrong kind of dependency.
RAW="https://raw.githubusercontent.com/${REPO}/main"

platform_of () {
  case "$1" in
    *.apk)            printf 'Android' ;;
    *.exe)            printf 'Windows' ;;
    *-linux)          printf 'Linux' ;;
    *.zip)            printf 'Bundle' ;;
    *.md|*.txt)       printf 'Text' ;;
    *)                printf 'File' ;;
  esac
}

human () { # bytes -> "9.1 MB"
  awk -v b="$1" 'BEGIN {
    if (b >= 1048576) printf "%.1f MB", b / 1048576;
    else if (b >= 1024) printf "%.0f KB", b / 1024;
    else printf "%d B", b;
  }'
}

BODY="$(mktemp)"
trap 'rm -f "$BODY"' EXIT

{
  echo '<p align="center"><img src="'"$RAW"'/docs/assets/icon-192.png" width="96" height="96" alt="Poet&#39;s Studio"></p>'
  echo
  echo '<p align="center"><strong>Rhyme, metre and fixed forms &mdash; a workshop that measures the poem you wrote.</strong><br>'
  echo 'Offline, no accounts, no telemetry, no generator. The whole 124,926-word dictionary — 133,971 pronunciations — is inside the file.</p>'
  echo
  echo '| Build | File | Size | SHA-256 |'
  echo '|---|---|---|---|'

  gh release view "$TAG" --repo "$REPO" --json assets \
    --jq '.assets[] | [.name, (.size | tostring), (.digest // "")] | @tsv' |
  while IFS="$(printf '\t')" read -r name size digest; do
    [ -n "$name" ] || continue
    printf '| %s | `%s` | %s | `%s` |\n' \
      "$(platform_of "$name")" "$name" "$(human "$size")" "${digest#sha256:}"
  done

  echo
  echo '**Android** — download the APK and open it; no store, no account.  '
  echo '**Windows** — portable EXE, no installer, no registry writes.  '
  echo '**Linux** — one binary; it serves the app on loopback and opens your browser.  '
  echo "**Or nothing at all** — the workshop also runs straight from [the live page](https://${REPO%%/*}.github.io/${APP}/), and installs itself from the browser."
  echo
  echo '<p align="center">'
  for b in live tests licence offline deps dict; do
    echo '<img src="'"$RAW"'/docs/assets/badge-'"$b"'.svg" height="22" alt="'"$b"'">'
  done
  echo '</p>'
  echo
  echo "Built from \`${GITHUB_SHA:-the newest commit on main}\`. What changed is in [CHANGELOG.md](https://github.com/${REPO}/blob/main/CHANGELOG.md) and [ENHANCEMENTS.md](https://github.com/${REPO}/blob/main/ENHANCEMENTS.md)."
} > "$BODY"

if [ "$MODE" = "--dry-run" ]; then
  cat "$BODY"
  exit 0
fi

gh release edit "$TAG" --repo "$REPO" --notes-file "$BODY"
echo "release notes rewritten for $TAG in $REPO"
