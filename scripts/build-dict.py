#!/usr/bin/env python3
"""build-dict.py — regenerate docs/play/dict.js from the CMU Pronouncing Dictionary.

    python3 scripts/build-dict.py path/to/cmudict.dict

The dictionary ships as a JS string of "word<TAB>phonemes" lines in a
single-character ARPAbet encoding: each phoneme is one printable character at
code 33 + its index in Poetry.ALPHABET. That is about half the bytes of the plain
text and it decodes in one pass.

TWO THINGS THIS SCRIPT IS CAREFUL ABOUT

1. EVERY pronunciation is kept. cmudict gives "read" two readings and "wind" two,
   and those are exactly the words whose metre a poet needs measured correctly.
   Extra readings follow the first on the same line, separated by "|".

2. Nothing is guessed at. An entry whose phonemes are not in the alphabet (cmudict
   carries a handful of annotated entries) is dropped, not approximated — and the
   count of what was dropped is printed.

The source is BSD-2-Clause (cmusphinx/cmudict); its licence travels with the data
in NOTICE.md.

MIT. (c) 2026 Dr Sohil Momin.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "play" / "dict.js"

# The same order as Poetry.ALPHABET in poetry.js. It is duplicated here on
# purpose: this script runs offline, in Python, and must not need the app to run.
VOWELS = ["AA", "AE", "AH", "AO", "AW", "AY", "EH", "ER", "EY",
          "IH", "IY", "OW", "OY", "UH", "UW"]
CONSONANTS = ["B", "CH", "D", "DH", "F", "G", "HH", "JH", "K", "L", "M",
              "N", "NG", "P", "R", "S", "SH", "T", "TH", "V", "W", "Y", "Z", "ZH"]

ALPHABET: list[str] = []
for v in VOWELS:
    for stress in range(3):
        ALPHABET.append(v + str(stress))
ALPHABET.extend(CONSONANTS)
INDEX = {p: i for i, p in enumerate(ALPHABET)}

WORD = re.compile(r"^[a-z']+$")
VARIANT = re.compile(r"^(.*)\(\d+\)$")


def encode(phones: list[str]) -> str | None:
    out = []
    for p in phones:
        i = INDEX.get(p)
        if i is None:
            return None
        out.append(chr(33 + i))
    return "".join(out)


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(__doc__.strip().splitlines()[2], file=sys.stderr)
        return 2
    src = Path(argv[1])
    text = src.read_text(encoding="utf-8", errors="replace")

    words: dict[str, list[str]] = {}   # word -> [encoded pronunciation, ...]
    dropped_annotated = 0
    dropped_name = 0
    lines = 0

    for raw in text.splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line:
            continue
        parts = line.split()
        if len(parts) < 2:
            continue
        lines += 1
        word = parts[0].lower()
        m = VARIANT.match(word)
        if m:
            word = m.group(1)
        if not WORD.match(word):
            dropped_name += 1
            continue
        enc = encode(parts[1:])
        if enc is None:
            dropped_annotated += 1
            continue
        bucket = words.setdefault(word, [])
        if enc not in bucket:          # cmudict repeats some entries exactly
            bucket.append(enc)

    extra = sum(len(v) - 1 for v in words.values())
    body = "\n".join(
        w + "\t" + "|".join(prons)
        for w, prons in sorted(words.items())
    )

    header = (
        "(function (root, factory) {\n"
        "  if (typeof module === \"object\" && module.exports) module.exports = factory();\n"
        "  else root.CMUDICT_SUBSET = factory();\n"
        "})(typeof globalThis !== \"undefined\" ? globalThis : this, function () {\n"
        "  // The CMU Pronouncing Dictionary (BSD-2-Clause, cmusphinx/cmudict):\n"
        f"  // {len(words)} words and {len(words) + extra} pronunciations, "
        "\"word<TAB>phonemes\" per line, in a\n"
        "  // single-character ARPAbet encoding — each phoneme is one printable\n"
        "  // character at code 33 + its index in Poetry.ALPHABET. That is about half\n"
        "  // the bytes of the plain text, and it decodes in one pass. The tab is what\n"
        "  // says \"encoded\"; a space means plain ARPAbet, so a dictionary can still\n"
        "  // be pasted in by hand. Extra pronunciations of the same word follow the\n"
        "  // first, separated by \"|\" — \"read\" is both R IY1 D and R EH1 D, and the\n"
        "  // metre chooses. Regenerate with scripts/build-dict.py.\n"
        f"  // {dropped_annotated} entries carrying annotations the alphabet cannot\n"
        "  // hold, and non-word entries, are omitted rather than guessed at.\n"
        "  return \""
    )
    js = header + body.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n") + "\";\n});\n"
    OUT.write_text(js, encoding="utf-8")

    size = OUT.stat().st_size
    print(f"read {lines} cmudict lines from {src}")
    print(f"kept {len(words)} words, {len(words) + extra} pronunciations ({extra} extra readings)")
    print(f"dropped {dropped_annotated} annotated entries and {dropped_name} non-word entries")
    print(f"wrote {OUT.relative_to(ROOT)} ({size / 1048576:.2f} MB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
