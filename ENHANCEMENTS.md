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

### Offline and installable

| | What was added |
|---|---|
| A1 | **Service worker + manifest** — `docs/play/sw.js` and `manifest.webmanifest`. HTML is network-first (the cache is only the offline fallback), assets are cache-first with a background refresh, `CACHE` is bumped per release, `registration.update()` runs on load, and the footer prints a build stamp. The app now installs from the browser with no store. |
| A2 | **Single-file build** — `scripts/build-single.mjs` inlines the six files into `dist/poets-studio.html` (~2.3 MB), and fails the build if an external script, a manifest link or an absolute URL survives. |
| A3 | **Generated icon set** — `scripts/icons.sh` renders 16/32/48/180/192/512 plus a maskable 512 from `docs/icon.svg` with headless Chromium. No image service. |
| A4 | **Print stylesheet** — `Ctrl/Cmd+P` prints the poem and its measure, without the tabs, buttons or furniture. |
| A5 | **Offline first-run note** — the landing page says how it installs and that the whole app is one file. |

### The engine

| | What was added |
|---|---|
| B1 | **Elided and archaic lexicon** — around thirty forms (`dimm'd`, `untrimm'd`, `ow'st`, `grow'st`, `know'st`, `wander'st`, `ne'er`, `o'er`, `'tis`, `'gainst`, `heav'n`, …) carry a hand-written pronunciation. Shakespeare's Sonnet 18 lost all five "not in the dictionary" warnings; the failures that remain are stress-model disagreements, not apostrophes. |
| B3 | **`Poetry.schemeOf` wired into the gutter** — every line ending now shows the letter it is rhyming on, lettered in order of first appearance. |
| B4 | **Foot-level diagnosis** — instead of "leaves iambic pentameter in 3 of 10 syllables", the message names the foot that broke and which way the beat falls there. |
| B5 | **My words** — a local, editable list of words with their ARPAbet sounds, appended to the dictionary text before parsing, so a name or a dialect form is measured exactly like any other word. |
| B6 | **Foot naming** was already there (spondaic, trochaic, anapaestic …) and is now reachable for every form that declares a foot. |

### Forms

| | What was added |
|---|---|
| C1 | **Five new forms** — blank verse, terza rima (a real chain check, not a scheme), rubaiyat quatrain, tanka, limerick (with a syllable of slack, because a limerick is sung). The checker is now generic: a form is data — `syllablePattern`, `lineCount`, `syllables`, `foot`, `tolerance`, `scheme` — so the next form is a dozen lines, not a branch. |
| C2 | **Custom stanza is a dialog**, not two sequential `prompt()` calls. |

### Journal and data

| | What was added |
|---|---|
| D1 | **Import a journal** — the JSON export now has a way back in, with id collisions renamed rather than dropped. |
| D3 | **Version diff** — a line-level LCS diff between the last two versions of a draft, so "3 versions" says what changed. |
| D4 | **Undo a delete** — one level, from the journal, instead of `confirm()` and gone. |
| D5 | **Rename and copy a draft** — the title is no longer the identity. |
| D6 | **Visible save state** — "kept on this device" while typing, "saved 14:32" after a save. |

### Accessibility and interface

| | What was added |
|---|---|
| E1 | **In-page dialogs** — `prompt`, `confirm` and `alert` are gone, because they are suppressed inside the WebView the APK ships in. The custom stanza, delete, rename and My words flows all work there now. |
| E2 | **Keyboard shortcuts** — `Ctrl/Cmd+S`, `Alt+R`, `Alt+1…9`. |
| E3 | **The verdict is a live region**, and line rows are focusable buttons with Enter/Space. |
| E4 | **Contrast fixes** — light-mode `--warn/--bad/--good`, the rose theme's own tints, and two real bugs the theme block was hiding: tabs painted solid accent over their own labels, and a dark-on-accent primary button. |
| E5 | **Clickable gutter** — a line row focuses the notes for that line, with "show every line" to clear it. |

### Releases with icons

| | What was added |
|---|---|
| F1 | **One icon set, committed** — `docs/assets/icon-*.png`, used by the manifest, the landing page and the release; the SVG in `docs/icon.svg` is the only source. |
| F4 | **Linux launcher** — `packaging/app-poets-studio.desktop` with `Icon=app-poets-studio`, ready to pair with the hicolor 256×256 PNG already in `docs/assets/`. |

### Verification

| | What was added |
|---|---|
| G2 | **Every landing-page slug is asserted** to open a sample or a rhyme, so a typo in a guided button fails the suite instead of a visitor. |
| G3 | **The tests badge is asserted against the suite** — the last assertion compares `badge-tests.svg` to the number the run is about to print, so a green build can never sit next to a stale count. |
| G4 | **No network API anywhere in the app** — `fetch`, `XMLHttpRequest`, `WebSocket` and `EventSource` are asserted absent from the shipped JS. |

The suite went from 74 to **113 assertions** on the way.

---

## Still open

| | Item | Why it is not done yet | Effort |
|---|---|---|---|
| B2 | **Every pronunciation** — CMUdict gives 2–4 for a large minority of words; one is kept, so `read`, `present`, `wind` are measured with one arbitrary reading | Needs the upstream cmudict source re-encoded into this repo's compact format; the source is not in the repo and regenerating it is its own reviewable change | M |
| C3 | **Akshara / mātrā counter** for Devanagari and Gujarati verse | The ghazal is on the shelf as an English form; its real home is a metre this engine cannot count. Rule-based syllabification per script is small and deterministic, but it is a new engine, not a patch | L |
| C4 | **Beher check for the ghazal** | Depends on C3 | L |
| D2 | **Drafts in IndexedDB** | `localStorage` caps around 5 MB. `web-kit` wraps IndexedDB already, but migrating live drafts is the one change that could lose someone's poems, so it wants its own commit and its own test | M |
| F2 | **Icon and version resource in the EXE** | The Windows build is produced by the `app-builder` kit's reusable workflow; changing it changes every app in the estate | M |
| F3 | **Android adaptive icon** | Same: the APK is built in `app-builder`. The foreground and background layers can be generated here first (`scripts/icons.sh` already renders the maskable variant) | M |
| F5 | **Release body with icons** — a table of the three builds with platform glyphs, sizes and SHA-256, generated by the workflow | The release is created by `app-builder`, not by this repo | S |
| F6 | **Dated tags beside `app-latest`** with a generated changelog | Same workflow, same reason | M |
| G1 | **`test-ui.mjs` in CI** with jsdom | Needs a `devDependency` and an `npm install` in CI. The app keeps zero runtime dependencies, so the harness may have some — but it should land with the other CI work, not on its own | S |

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
