# Enhancements

Every item here keeps the app's three promises, which are the reason it exists:

1. **It runs with the network off** — from `file://`, from GitHub Pages, from an APK in
   airplane mode.
2. **No external dependency at runtime** — no CDN, no webfont, no model, no API key,
   no npm package in the shipped app.
3. **Nothing leaves the device** — no account, no sync, no telemetry.

An item that would break one of those is not on this list, however useful it looks.
Effort is **S** (an afternoon), **M** (a day or two), **L** (a week or more).

---

## Shipped

### The engine

| | What was added |
|---|---|
| B1 | **Elided and archaic lexicon** — around thirty forms (`dimm'd`, `ow'st`, `grow'st`, `ne'er`, `heav'n`, …) carry a hand-written pronunciation, so a real sonnet is not marked inexact for its apostrophes. |
| B2 | **Two readings where a word has two** — `record`, `present`, `wind`, `read`, `blessed`, `learned`, `aged`, `beloved` and their kind keep both pronunciations, and the metre picks the one that lands on the syllable count the form asks for. Every combination is tried per line (bounded at five ambiguous words), so "the blessed rain" measures as three syllables or four depending on the form. |
| B3 | **`Poetry.schemeOf` wired into the gutter** — every line ending shows the letter it rhymes on. |
| B4 | **Foot-level diagnosis** — the metre message names the foot that broke and which way the beat falls there. |
| B5 | **My words** — a local list of words with their ARPAbet sounds, appended to the dictionary text before parsing. |
| B6 | **Foot naming** for every form that declares a foot. |

### A metre for Devanagari and Gujarati

| | What was added |
|---|---|
| C3 | **A mātrā counter** — a consonant carries its inherent vowel (1), a mātrā sign replaces it with its own weight, a halant kills it; anusvara and chandrabindu add nothing, visarga adds 1. `कल` is 2, `काल` is 3, `क्` is 0. The gutter shows mātrā instead of syllables for these scripts. |
| C4 | **The ghazal's beher** — two lines that share a beher share a mātrā count, so that is what the ghazal checks, line by line, and reports. A ghazal in Devanagari now passes on its own terms instead of being measured as English. |
| — | **Words in any script** — the word breaker kept only `A-Z`, so a Hindi line arrived as *no words at all*. It now keeps `\p{L}` and `\p{M}`, which is what made the two items above possible. |

### Forms

| | What was added |
|---|---|
| C1 | **Five new forms** — blank verse, terza rima (a real chain check, not a scheme), rubaiyat quatrain, tanka, limerick (with a syllable of slack). The checker is generic: a form is data — `syllablePattern`, `lineCount`, `syllables`, `foot`, `tolerance`, `scheme`. |
| C2 | **Custom stanza is a dialog**, not two sequential `prompt()` calls. |

### Journal and data

| | What was added |
|---|---|
| D1 | **Import a journal** — with id collisions renamed rather than dropped. |
| D2 | **Drafts in IndexedDB** — localStorage is still the first read (it is synchronous, so the page paints at once) and the fallback when IndexedDB is unavailable; the migration runs once and the local mirror is then dropped, so the 5 MB ceiling stops mattering. |
| D3 | **Version diff** — a line-level LCS diff between the last two versions. |
| D4 | **Undo a delete** — one level, from the journal. |
| D5 | **Rename and copy a draft.** |
| D6 | **Visible save state.** |

### Accessibility and interface

| | What was added |
|---|---|
| E1 | **In-page dialogs** — `prompt`, `confirm` and `alert` are gone, because they are suppressed inside the WebView the APK ships in. |
| E2 | **Keyboard shortcuts** — `Ctrl/Cmd+S`, `Alt+R`, `Alt+1…9`. |
| E3 | **The verdict is a live region**; line rows are focusable buttons. |
| E4 | **Contrast fixes** — light-mode tokens, the rose theme's own tints, plus two real bugs the theme block was hiding: tabs painted solid accent over their own labels, and a dark-on-accent primary button. |
| E5 | **Clickable gutter** — a line row focuses the notes for that line. |

### Offline, installable, and the release

| | What was added |
|---|---|
| A1 | **Service worker + manifest** — HTML network-first, assets cache-first, `CACHE` bumped per release, `registration.update()` on load, build stamp in the footer. |
| A2 | **Single-file build** — `scripts/build-single.mjs` inlines everything into `dist/poets-studio.html` (~2.3 MB) and fails if an external script, a manifest link or an absolute URL survives. |
| A3 | **Generated icon set** — 16/32/48/180/192/512 plus a maskable 512, from `docs/icon.svg`. |
| A4 | **Print stylesheet** — `Ctrl/Cmd+P` prints the poem and its measure. |
| A5 | **Offline first-run note** on the landing page. |
| F1 | **One icon set, committed**, used by the manifest, the landing page and the release. |
| F3 | **Adaptive-icon layers** — `icon-adaptive-background.png`, `icon-adaptive-foreground.png` (glyph inside the 66% safe zone) and `icon-monochrome.png` for themed icons, rendered from `docs/icon-glyph.svg`. |
| F4 | **Linux launcher** — `packaging/app-poets-studio.desktop`. |
| F5 | **The release describes itself** — `scripts/release-notes.sh` rewrites the rolling release body with the app's icon, a table of the three builds with sizes and SHA-256 digests read back from the published release, and the local badges. A `announce` job runs it after every build, so the page cannot describe a build that is not there. |
| F6 | **Versioned releases** — `VERSION` and `changes/` feed the kit's changelog consumer, so every release gets a version tag and a changelog written *with* the change rather than reconstructed later. |

### Verification

| | What was added |
|---|---|
| G1 | **`test-ui.mjs` runs in CI** — jsdom is installed as a harness dependency and never shipped, so the app keeps zero runtime dependencies while the page is proved to boot in a real DOM (20 assertions: the measure, the scheme gutter, the mātrā row, the dialogs, a saved draft). |
| G2 | **Every landing-page slug is asserted** to open a sample or a rhyme. |
| G3 | **The tests badge is asserted against the suite** — the last assertion compares the badge to the number the run is about to print. |
| G4 | **No network API anywhere in the app** — `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource` are asserted absent. |

The suite went from 74 to **132 assertions** in `test-node.js`, plus 20 in `test-ui.mjs`.

---

## Still open

| | Item | Why it is not done yet | Effort |
|---|---|---|---|
| B2′ | **Every pronunciation for every word** — the curated set covers the homographs that change a line's metre; the other ~15% of CMUdict words still keep one reading | Needs the upstream cmudict source re-encoded into this repo's compact format. The curated table is the honest 80% at 1 KB instead of 400 KB | M |
| C5 | **Urdu script** for the ghazal | Its short vowels are not written, so a mātrā count would be a guess dressed as a measurement. Doing it properly needs a beher table per metre (19 of them) and a transliteration pass | L |
| F2 | **Icon and version resource in the EXE** | The Windows build is produced by the `app-builder` kit's reusable workflow; changing it changes every app in the estate | M |
| F3′ | **Wiring the adaptive layers into the APK** | The layers exist; the APK's icon is set in `app-builder`. The kit already verifies the APK carries *an* icon — this would make it carry *this* one | M |
| D7 | **Sync between tabs** | Two tabs open on the same journal will overwrite each other. A `BroadcastChannel` or a `storage` event is enough, but it wants a test that actually opens two contexts | M |

## Not doing, and why

- **An AI line generator.** The refusal is the product. A workshop that writes the line
  has nothing left to measure.
- **Cloud sync or accounts.** Every case in this estate is device-local; a login would
  be the only thing in the app that needs the network.
- **Webfonts, icon fonts, CDN scripts.** The dictionary already costs 2.2 MB; a font is
  the wrong 200 KB, and a CDN is a page that breaks on a train.
- **Analytics.** Nothing here needs to know who is writing.
- **A native rewrite.** The single HTML file is the distribution strategy: it runs from
  `file://`, from Pages, and inside the APK without three copies of the logic.
