#!/usr/bin/env python3
"""Draw the repository's badges as local SVG files.

An offline-first app should not need an image service to describe itself, and a
page that breaks its own promise on the first screen is a bad joke. These are
drawn here, committed, and referenced by relative path, so they render on GitHub
Pages, in the README, and from `file://` with no network at all.

Every claim below is one the repository can be checked against:

    live      docs/play/index.html ships in this repo and on Pages
    tests     the number `node test-node.js` actually prints (132)
    licence   LICENSE, PolyForm Noncommercial 1.0.0
    offline   the app makes no network request (test-node.js asserts it)
    deps      0 runtime dependencies
    dict      the entry count in docs/play/dict.js

    python3 scripts/badges.py
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "assets")

# The landing page's own palette, so the badges belong to the page they sit on.
INK = "#101820"
CREAM = "#eef3f7"
CYAN = "#0e7490"
MOSS = "#2f6b45"
SLATE = "#3d4b5c"

BADGES = [
    ("live", "live", "online", MOSS),
    ("tests", "tests", "132 passing", MOSS),
    ("licence", "licence", "PolyForm NC 1.0.0", CYAN),
    ("offline", "offline", "no network", INK),
    ("deps", "deps", "0 runtime", INK),
    ("dict", "dictionary", "124,085 words", SLATE),
]

CH = 6.6  # approximate advance width at 11px in a monospace-ish sans


def badge(label, value, colour):
    lw = int(len(label) * CH) + 16
    vw = int(len(value) * CH) + 16
    total = lw + vw
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="22" role="img" '
        'aria-label="%s: %s">'
        '<title>%s: %s</title>'
        '<linearGradient id="s" x2="0" y2="100%%"><stop offset="0" stop-color="#fff" stop-opacity=".10"/>'
        '<stop offset="1" stop-color="#000" stop-opacity=".10"/></linearGradient>'
        '<clipPath id="r"><rect width="%d" height="22" rx="4" fill="#fff"/></clipPath>'
        '<g clip-path="url(#r)">'
        '<rect width="%d" height="22" fill="%s"/>'
        '<rect x="%d" width="%d" height="22" fill="%s"/>'
        '<rect width="%d" height="22" fill="url(#s)"/>'
        "</g>"
        '<g fill="%s" font-family="ui-sans-serif,Segoe UI,Helvetica,Arial,sans-serif" font-size="11" '
        'text-anchor="middle">'
        '<text x="%d" y="15">%s</text>'
        '<text x="%d" y="15">%s</text>'
        "</g></svg>"
    ) % (total, label, value, label, value, total, lw, INK, lw, vw, colour, total,
         CREAM, lw // 2, label, lw + vw // 2, value)


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, label, value, colour in BADGES:
        path = os.path.join(OUT, "badge-%s.svg" % name)
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(badge(label, value, colour))
        print("wrote", os.path.relpath(path, ROOT))


if __name__ == "__main__":
    main()
