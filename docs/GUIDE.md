# Poet's Studio — user guide

**Version 1.2.0 · PolyForm Noncommercial 1.0.0**

A workbench for writing formal poetry: rhyme found by *sound*, metre counted per line, and fixed
forms that check you as you go. It runs in the browser, offline, with no network call anywhere in the
app — a test asserts that.

## Rhyme is found by sound, not spelling

The rhymes come from a pronouncing dictionary, so `though` and `cough` are correctly told apart and
`say` rhymes with `away`. Spelling is never consulted.

| Strength | What it shares | Examples |
|---|---|---|
| **Perfect** | the same sound from the last stressed vowel | `wall` / `fall`, `day` / `grey` |
| **Near** | the same consonant frame, a different vowel | `cat` / `cot`, `love` / `move` |
| **Slant** | the same stressed vowel, a different ending | `cat` / `cap` |

A syllable filter narrows the list. Where a word has two pronunciations — `record`, `present`, `wind`,
`read`, `blessed`, `learned` — both are kept, and the metre picks the one the line asks for.

## Metre, and what it will not claim

Every line is counted and its stress pattern shown as a running bar. **A metre is named only when at
least 60% of its feet fit.** When it is not, the name is left off and the message names the **foot
that broke** and which way the beat falls there — a metre count that is quietly wrong is worse than
one that says it is unsure.

The same rule applies to words it does not know: an unknown word is named in the line, counted as one
syllable, and the line is marked inexact.

## The scheme as you are making it

The gutter letters each line ending A, B, C … in order of first appearance — so you see the rhyme you
are *actually* writing rather than the one you meant to write.

## Fixed forms that check you

Shakespearean sonnet, blank verse, terza rima, rubaiyat quatrain, haiku, tanka, limerick, ghazal, and
a custom stanza with your own syllable counts and scheme. Each is a live pass/fail **with the reason,
per line** — not a badge that says "invalid".

A **ghazal in Devanagari or Gujarati** is measured in *mātrā*, not English phonemes: every line of a
couplet must share the same count, which is the practical test of a shared beher. The script is named
under the form.

## Samples to load

A sonnet that passes, a haiku, a tanka, a ghazal with a radif, a ghazal in Devanagari, and one haiku
that is a syllable long in its first line — so you can watch the app say so. The tests assert the
verdict each sample exists to demonstrate.

## My words

Teach it a name, a dialect form or an invented word by giving its sounds in **ARPAbet**. It is appended
to the dictionary text before parsing, so the metre and the rhyme finder treat it like any other word.
It stays on the device.

## The journal

Drafts, versions and notes live on the device in **IndexedDB** rather than localStorage — a journal of
versions should not be up against a 5 MB ceiling. Import as well as export, diff two versions line by
line, rename, copy, undo a delete. Two tabs on the same journal tell each other when one saves, so
neither silently reverts the other.

Export one poem, the whole journal as JSON, or every draft as a ZIP. `Ctrl/Cmd+P` prints the poem and
its measure without the furniture.

## What it refuses to do

- **Write the poem.** No generator, no prompt box, no suggestion engine.
- **Guess at an unknown word** rather than naming it.
- **Call an irregular line regular.**
- **Reach the network.**

## Licence

PolyForm Noncommercial 1.0.0. See [LICENSE](../LICENSE).
