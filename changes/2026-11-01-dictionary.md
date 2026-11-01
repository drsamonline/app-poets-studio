---
bump: minor
---

The dictionary now carries **every** pronunciation, not one per word: 133,971
readings of 124,926 words, 8,383 of them with more than one. `fire` measures as one
syllable or two and `read` as *reed* or *red*, and the metre picks the reading that
lands on the count the form asks for. The derivation is reproducible —
`python3 scripts/build-dict.py path/to/cmudict.dict` — and the file is smaller than
the one it replaced. Two tabs on the same journal now tell each other when one of
them saves, so neither silently reverts the other.
