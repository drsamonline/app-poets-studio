# Enhancements

Every item here keeps the app's three promises, which are the reason it exists:

1. **It runs with the network off** — from `file://`, from GitHub Pages, from an APK in
   airplane mode.
2. **No external dependency at runtime** — no CDN, no webfont, no model, no API key,
   no npm package in the shipped app.
3. **Nothing leaves the device** — no account, no sync, no telemetry.

An item that would break one of those is not on this list, however useful it looks.

**Status: everything on the list is shipped.** The one item dropped by request is Urdu
script (see the last section), and one nicety is left on the kit's side.

---

## Shipped

### The dictionary

| | What was added |
|---|---|
| B2 | **Every pronunciation, not one per word.** `scripts/build-dict.py` regenerates `dict.js` from the upstream cmudict, keeps all 133,971 pronunciations of 124,926 words, and de-duplicates. 8,383 words have more than one reading — `fire` is one syllable or two, `read` is *reed* or *red* — and the metre picks the one that lands on the count the form asks for. The derivation is reproducible and the file is *smaller* than the one it replaced. |
| B2′ | **A curated table for the homographs that matter most** — `record`, `present`, `wind`, `blessed`, `learned`, `aged`, `beloved` — so the reading is right even in free verse, where no form declares a target count. |

### The engine

| | What was added |
|---|---|
| B1 | **Elided and archaic lexicon** — around thirty forms (`dimm'd`, `ow'st`, `grow'st`, `ne'er`, `heav'n`, …) carry a hand-written pronunciation. |
| B3 | **`Poetry.schemeOf` wired into the gutter** — every line ending shows the letter it rhymes on. |
| B4 | **Foot-level diagnosis** — the metre message names the foot that broke and which way the beat falls there. |
| B5 | **My words** — a local list of words with their ARPAbet sounds, appended to the dictionary text before parsing. |
| B6 | **Foot naming** for every form that declares a foot. |

### A metre for Devanagari and Gujarati

| | What was added |
|---|---|
| C3 | **A mātrā counter** — a consonant carries its inherent vowel (1), a mātrā sign replaces it with its own weight, a halant kills it. `कल` is 2, `काल` is 3, `क्` is 0. |
| C4 | **The ghazal's beher** — every line of a couplet must share the mātrā count, which is what the ghazal checks and reports. A sample ghazal in Devanagari passes at 17 a line. |
| — | **Words in any script** — the word breaker kept only `A-Z`, so a Hindi line arrived as *no words at all*. It keeps `\p{L}` and `\p{M}` now. |

### Forms

| | What was added |
|---|---|
| C1 | **Five new forms** — blank verse, terza rima (a chain check, not a scheme), rubaiyat quatrain, tanka, limerick. The checker is generic: a form is data. |
| C2 | **Custom stanza is a dialog**, not two sequential `prompt()` calls. |

### Journal and data

| | What was added |
|---|---|
| D1 | **Import a journal**, with id collisions renamed rather than dropped. |
| D2 | **Drafts in IndexedDB** — localStorage stays the synchronous first read and the fallback; the migration runs once and the mirror is then dropped, so the 5 MB ceiling stops mattering. |
| D3 | **Version diff** — a line-level LCS diff between the last two versions. |
| D4 | **Undo a delete.** |
| D5 | **Rename and copy a draft.** |
| D6 | **Visible save state.** |
| D7 | **Two tabs, one journal** — a save tells the other tab to reload (BroadcastChannel, with the `storage` event as the fallback), so neither silently reverts the other. |

### Accessibility and interface

| | What was added |
|---|---|
| E1 | **In-page dialogs** — `prompt`, `confirm` and `alert` are gone, because they are suppressed inside the APK's WebView. |
| E2 | **Keyboard shortcuts** — `Ctrl/Cmd+S`, `Alt+R`, `Alt+1…9`. |
| E3 | **The verdict is a live region**; line rows are focusable buttons. |
| E4 | **Contrast fixes**, plus two real bugs the theme block was hiding: tabs painted solid accent over their own labels, and a dark-on-accent primary button. |
| E5 | **Clickable gutter** — a line row focuses the notes for that line. |

### Offline, installable, and the release

| | What was added |
|---|---|
| A1 | **Service worker + manifest** — HTML network-first, assets cache-first, `CACHE` bumped per release, build stamp in the footer. |
| A2 | **Single-file build** — `dist/poets-studio.html` (~2.3 MB), and the build fails if anything external survives. |
| A3 | **Generated icon set** — 16/32/48/180/192/512 plus a maskable 512, from `docs/icon.svg`. |
| A4 | **Print stylesheet.** |
| A5 | **Offline first-run note** on the landing page. |
| F1 | **One icon set, committed**, used by the manifest, the landing page and the release. |
| F2 | **A real icon in the EXE** — the kit's `make_icons.py` reads an icon from the app directory, so `docs/play/icon.png` is the icon the Windows build now carries, instead of the fallback glyph it had been drawing. |
| F3 | **A real launcher icon in the APK** — the same file feeds `ic_launcher.png` and its round variant at every density. `icon-adaptive-background.png`, `icon-adaptive-foreground.png` (glyph inside the 66% safe zone) and `icon-monochrome.png` are committed for the adaptive-icon step. |
| F4 | **Linux launcher** — `packaging/app-poets-studio.desktop`. |
| F5 | **The release describes itself** — `scripts/release-notes.sh` rewrites the rolling release body with the icon, a table of the three builds with sizes and SHA-256 digests read back from the published release, and the local badges. An `announce` job runs it after every build. |
| F6 | **Versioned releases** — `VERSION` and `changes/` feed the kit's changelog consumer, so every release gets a version tag and a changelog written *with* the change. |

### Verification

| | What was added |
|---|---|
| G1 | **`test-ui.mjs` runs in CI** with jsdom as a harness dependency only — 23 assertions on the measure, the scheme gutter, the mātrā row, the dialogs, a saved draft and the cross-tab wiring. |
| G2 | **Every landing-page slug is asserted** to open a sample or a rhyme. |
| G3 | **The tests badge is asserted against the suite** — the last assertion compares the badge to the number the run is about to print. |
| G4 | **No network API anywhere in the app** — `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource` are asserted absent. |

**136 assertions** in `test-node.js`, **23** in `test-ui.mjs`.

---

## What is left

Nothing. The list is empty.

The last item — the adaptive-icon XML Android reads for a *shaped* icon — needed a kit
change, because the APK's resource tree belongs to `app-builder`. It landed as an
**opt-in** input (`adaptive_icon`, default `false`): the step writes into the APK's
resources, so it is off for every other app in the estate and on only here. The
generator reads this repo's own `icon-adaptive-foreground.png` and
`icon-adaptive-background.png`, and would derive both from the plain icon for a repo
that has only one.

### Urdu script — dropped by request

The ghazal's native script was on the list and is now off it. Counting it honestly needs
two things this app does not have: a beher table for the nineteen classical metres, and a
transliteration pass, because Urdu does not write its short vowels. A mātrā count over
unwritten vowels would be a guess dressed up as a measurement — exactly what the app
refuses to do elsewhere. Devanagari and Gujarati are counted because their vowels *are*
written.

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
