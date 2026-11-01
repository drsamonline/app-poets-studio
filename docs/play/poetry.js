/* poetry.js — the metre, rhyme and form engine for Poet's Studio.
 *
 * No dependencies. Works in the browser (window.Poetry) and in Node
 * (require("./poetry.js")), so the same code that measures your poem is the
 * code the tests measure.
 *
 * Everything here MEASURES. Nothing here writes a line of verse.
 *
 * MIT. (c) 2026 Dr Sohil Momin.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Poetry = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /* ------------------------------------------------------------------ */
  /* phonetics                                                          */
  /* ------------------------------------------------------------------ */

  // The ARPAbet vowel set. A syllable IS a vowel phoneme — that is the whole
  // definition, and it is why a pronouncing dictionary beats a heuristic.
  var VOWELS = {
    AA: 1, AE: 1, AH: 1, AO: 1, AW: 1, AY: 1, EH: 1, ER: 1,
    EY: 1, IH: 1, IY: 1, OW: 1, OY: 1, UH: 1, UW: 1
  };

  function base(p) { return String(p).replace(/[0-9]/g, ""); }
  function isVowel(p) { return !!VOWELS[base(p)]; }

  // 0 unstressed · 1 primary · 2 secondary. For metre, 2 counts as stressed:
  // a secondary stress can carry a beat, and treating it as unstressed made
  // every compound word ("blackbird") scan as a pyrrhic.
  function stressOf(p) { var m = String(p).match(/([0-9])$/); return m ? +m[1] : 0; }
  function isStressed(p) { return stressOf(p) >= 1; }

  /* ------------------------------------------------------------------ */
  /* the dictionary                                                     */
  /* ------------------------------------------------------------------ */

  // The dictionary ships in a one-character-per-phoneme encoding, because the
  // plain ARPAbet text is 3.6 MB and this is 1.9 MB. Each character's code
  // minus 33 is an index into ALPHABET.
  var ALPHABET = (function () {
    var a = [], i, s;
    var vowels = ["AA", "AE", "AH", "AO", "AW", "AY", "EH", "ER", "EY",
      "IH", "IY", "OW", "OY", "UH", "UW"];
    for (i = 0; i < vowels.length; i++) for (s = 0; s < 3; s++) a.push(vowels[i] + s);
    var cons = ["B", "CH", "D", "DH", "F", "G", "HH", "JH", "K", "L", "M",
      "N", "NG", "P", "R", "S", "SH", "T", "TH", "V", "W", "Y", "Z", "ZH"];
    for (i = 0; i < cons.length; i++) a.push(cons[i]);
    return a;
  })();

  function decodePhones(s) {
    var out = [];
    for (var i = 0; i < s.length; i++) {
      var p = ALPHABET[s.charCodeAt(i) - 33];
      if (p) out.push(p);
    }
    return out;
  }

  // "word<TAB><encoded phonemes>" per line, or plain "word P1 P2". The tab is
  // what marks a line as encoded, so the two forms can never be confused (an
  // earlier version guessed from the characters, and read the encoded word
  // "my" — M + AY1 — as the two plain phonemes X and 1).
  // Returns { words: {word: [phones]}, size: n }.
  function parseDict(text) {
    var words = {}, extra = {}, size = 0;
    String(text).split("\n").forEach(function (line) {
      line = line.replace(/\r$/, "");
      if (!line || line.charAt(0) === "#") return;
      var tab = line.indexOf("\t"), w, rest;
      if (tab > 0) {
        w = line.slice(0, tab);
        var rest = line.slice(tab + 1);
        if (rest.indexOf("|") >= 0) {
          // every pronunciation the dictionary has for this word; the first is
          // the one a lookup returns, the rest are there for the metre to choose
          var parts = rest.split("|");
          words[w] = decodePhones(parts[0]);
          extra[w] = parts.slice(1).map(function (x) { return decodePhones(x); });
        } else {
          words[w] = decodePhones(rest);
        }
      } else {
        var sp = line.indexOf(" ");
        if (sp < 1) return;
        w = line.slice(0, sp);
        words[w] = line.slice(sp + 1).split(/\s+/);
      }
      size++;
    });
    return { words: words, variants: extra, size: size };
  }

  // A word is a word in any script. Stripping to A-Z threw away every Devanagari
  // and Gujarati line whole, which made a ghazal in Hindi measure as no lines at
  // all. \p{L} is a letter in any script; the apostrophe is kept for elisions.
  var PUNCT = /^[^\p{L}\p{M}']+|[^\p{L}\p{M}']+$/gu;

  function normalise(word) {
    return String(word == null ? "" : word).toLowerCase().replace(PUNCT, "");
  }

  // The words of a line, in order, with the ones the dictionary does not know
  // kept rather than dropped: an unknown word is a fact about the line, and
  // hiding it would make the metre count quietly wrong.
  function words(line) {
    return String(line == null ? "" : line)
      .split(/[\s\u2014\u2013]+/)
      .map(normalise)
      .filter(function (w) { return w.length > 0; });
  }

  // Elided and archaic forms. Verse contracts words in ways no dictionary
  // records — and normalise() keeps the apostrophe, so "dimm'd" never matches
  // anything. Each entry is the pronunciation the contraction actually has
  // ("dimm'd" is one syllable, not two), so a real sonnet is not marked
  // inexact for its apostrophes. This is the only hand-written pronunciation
  // data in the engine; the rest comes from the bundled dictionary.
  var ELIDED = {
    "dimm'd": "D IH1 M D", "untrimm'd": "AH2 N T R IH1 M D", "trimm'd": "T R IH1 M D",
    "ow'st": "OW1 S T", "grow'st": "G R OW1 S T", "know'st": "N OW1 S T",
    "wander'st": "W AA1 N D ER0 S T", "giv'st": "G IH1 V S T", "do'st": "D UW1 S T",
    "ne'er": "N EH1 R", "e'er": "EH1 R", "o'er": "AO1 R",
    "'tis": "T IH1 Z", "'twas": "T W AA1 Z", "'gainst": "G EH1 N S T",
    "'twixt": "T W IH1 K S T", "'bove": "B AH1 V", "'fore": "F AO1 R",
    "heav'n": "HH EH1 V AH0 N", "sev'n": "S EH1 V AH0 N", "giv'n": "G IH1 V AH0 N",
    "bless'd": "B L EH1 S T", "fix'd": "F IH1 K S T", "look'd": "L UH1 K T",
    "lov'd": "L AH1 V D", "call'd": "K AO1 L D", "turn'd": "T ER1 N D",
    "stopp'd": "S T AA1 P T", "drown'd": "D R AW1 N D", "shew'd": "SH OW1 D"
  };

  // Words whose pronunciation changes what they mean. The dictionary keeps one
  // reading each, which makes "read", "present" and "wind" a coin toss; these
  // keep both, and the metre picks the one the line asks for.
  var VARIANTS = {
    read: ["R IY1 D", "R EH1 D"],
    live: ["L IH1 V", "L AY1 V"],
    wind: ["W IH1 N D", "W AY1 N D"],
    lead: ["L IY1 D", "L EH1 D"],
    close: ["K L OW1 S", "K L OW1 Z"],
    use: ["Y UW1 S", "Y UW1 Z"],
    house: ["HH AW1 S", "HH AW1 Z"],
    tear: ["T IH1 R", "T EH1 R"],
    bow: ["B OW1", "B AW1"],
    row: ["R OW1", "R AW1"],
    sow: ["S OW1", "S AW1"],
    wound: ["W UW1 N D", "W AW1 N D"],
    minute: ["M IH1 N AH0 T", "M AY0 N UW1 T"],
    object: ["AA1 B JH EH0 K T", "AH0 B JH EH1 K T"],
    subject: ["S AH1 B JH EH0 K T", "S AH0 B JH EH1 K T"],
    present: ["P R EH1 Z AH0 N T", "P R IH0 Z EH1 N T"],
    record: ["R EH1 K ER0 D", "R IH0 K AO1 R D"],
    desert: ["D EH1 Z ER0 T", "D IH0 Z ER1 T"],
    content: ["K AA1 N T EH0 N T", "K AH0 N T EH1 N T"],
    contract: ["K AA1 N T R AE2 K T", "K AH0 N T R AE1 K T"],
    invalid: ["IH1 N V AH0 L IH0 D", "IH2 N V AE1 L IH0 D"],
    refuse: ["R EH1 F Y UW2 Z", "R IH0 F Y UW1 Z"],
    entrance: ["EH1 N T R AH0 N S", "IH0 N T R AE1 N S"],
    does: ["D AH1 Z", "D OW1 Z"],
    // the -ed adjectives: one syllable in "the bless'd rain", two in "blessed are"
    blessed: ["B L EH1 S T", "B L EH1 S IH0 D"],
    learned: ["L ER1 N D", "L ER1 N IH0 D"],
    aged: ["EY1 JH D", "EY1 JH IH0 D"],
    beloved: ["B IH0 L AH1 V D", "B IH0 L AH1 V IH0 D"],
    cursed: ["K ER1 S T", "K ER1 S IH0 D"],
    winged: ["W IH1 NG D", "W IH1 NG IH0 D"],
    dogged: ["D AO1 G D", "D AO1 G IH0 D"],
    ragged: ["R AE1 G D", "R AE1 G IH0 D"],
    naked: ["N EY1 K D", "N EY1 K IH0 D"],
    crook: ["K R UH1 K", "K R UH1 K"],
    bass: ["B EY1 S", "B AE1 S"],
    dove: ["D AH1 V", "D OW1 V"]
  };

  function variantsOf(word, dict) {
    var w = normalise(word);
    var curated = VARIANTS[w];
    if (curated) return curated.map(function (x) { return x.split(/\s+/); });
    var rest = dict && dict.variants && dict.variants[w];
    if (rest && rest.length && dict.words[w]) return [dict.words[w]].concat(rest);
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* matra: the metre of Devanagari and Gujarati verse                   */
  /* ------------------------------------------------------------------ */

  // A syllable in these scripts is not a vowel phoneme, it is a written unit: a
  // consonant carries its inherent "a" (1 matra), a matra sign replaces it with
  // its own weight, and a halant kills it. A ghazal's couplets share a beher,
  // and the practical test of that is an equal matra count per line — which is
  // what this counts. (Urdu script is not counted: its short vowels are not
  // written, so a matra count would be a guess dressed as a measurement.)
  var SCRIPTS = {
    devanagari: {
      independent: { "\u0905": 1, "\u0906": 2, "\u0907": 1, "\u0908": 2, "\u0909": 1, "\u090A": 2,
        "\u090B": 1, "\u0960": 2, "\u090C": 1, "\u090F": 1, "\u0910": 2, "\u0913": 1, "\u0914": 2,
        "\u0950": 2 },
      matra: { "\u093E": 2, "\u093F": 1, "\u0940": 2, "\u0941": 1, "\u0942": 2, "\u0943": 1,
        "\u0944": 2, "\u0962": 1, "\u0947": 1, "\u0948": 2, "\u094B": 1, "\u094C": 2,
        "\u0945": 1, "\u0946": 1, "\u094A": 1, "\u0949": 2 },
      halant: "\u094D",
      consonant: /[\u0915-\u0939\u0958-\u095F]/,
      extra: { "\u0902": 0, "\u0901": 0, "\u0903": 1, "\u093C": 0, "\u093D": 0, "\u0951": 0, "\u0952": 0 }
    },
    gujarati: {
      independent: { "\u0A85": 1, "\u0A86": 2, "\u0A87": 1, "\u0A88": 2, "\u0A89": 1, "\u0A8A": 2,
        "\u0A8B": 1, "\u0AE0": 2, "\u0A8F": 1, "\u0A90": 2, "\u0A93": 1, "\u0A94": 2 },
      matra: { "\u0ABE": 2, "\u0ABF": 1, "\u0AC0": 2, "\u0AC1": 1, "\u0AC2": 2, "\u0AC3": 1,
        "\u0AC4": 2, "\u0AE2": 1, "\u0AC7": 1, "\u0AC8": 2, "\u0ACB": 1, "\u0ACC": 2,
        "\u0AC5": 1, "\u0AC9": 1 },
      halant: "\u0ACD",
      consonant: /[\u0A95-\u0AB9\u0AF9]/,
      extra: { "\u0A82": 0, "\u0A81": 0, "\u0A83": 1, "\u0ABC": 0, "\u0ABD": 0 }
    }
  };

  function scriptOf(text) {
    var t = String(text == null ? "" : text);
    if (/[\u0900-\u097F]/.test(t)) return "devanagari";
    if (/[\u0A80-\u0AFF]/.test(t)) return "gujarati";
    return "latin";
  }

  // Count the matras in one line. The inherent vowel of a consonant counts 1,
  // a halant makes it 0, and a matra sign replaces it — so "कल" is 2 and "क्"
  // is 0. Anusvara and chandrabindu nasalise the vowel they follow and add
  // nothing; visarga counts 1.
  function matras(line, script) {
    var table = SCRIPTS[script || scriptOf(line)];
    if (!table) return 0;
    var chars = Array.from(String(line == null ? "" : line));
    var n = 0;
    for (var i = 0; i < chars.length; i++) {
      var c = chars[i];
      if (table.independent[c] != null) { n += table.independent[c]; continue; }
      if (table.consonant.test(c)) {
        var v = 1;
        var j = i + 1;
        if (chars[j] === "\u093C" || chars[j] === "\u0ABC") j++;   // nukta sits between
        if (chars[j] === table.halant) { v = 0; i = j; }
        else if (table.matra[chars[j]] != null) { v = table.matra[chars[j]]; i = j; }
        n += v;                          // the sign is spent: it is never counted again
        continue;
      }
      if (table.matra[c] != null) { n += table.matra[c]; continue; }
      if (table.extra && table.extra[c] != null) { n += table.extra[c]; continue; }
    }
    return n;
  }

  function lookup(word, dict) {
    var w = normalise(word);
    var p = (dict && dict.words && dict.words[w]) || ELIDED[w] || (VARIANTS[w] && VARIANTS[w][0]);
    if (!p) return null;
    return typeof p === "string" ? p.split(/\s+/) : p;
  }

  /* ------------------------------------------------------------------ */
  /* syllables and stress                                               */
  /* ------------------------------------------------------------------ */

  function syllables(phones) {
    if (!phones) return 0;
    var n = 0;
    for (var i = 0; i < phones.length; i++) if (isVowel(phones[i])) n++;
    return n;
  }

  // One character per syllable: "1" stressed, "0" unstressed.
  function stressPattern(phones) {
    var out = "";
    if (!phones) return out;
    for (var i = 0; i < phones.length; i++) {
      if (isVowel(phones[i])) out += isStressed(phones[i]) ? "1" : "0";
    }
    return out;
  }

  // Analyse one line. `unknown` is the honest part: those words were counted as
  // one syllable each so the totals still add up, and they are named so the
  // writer knows the count is an estimate for those words only.
  // Pick one reading per word. When the form asks for a syllable count, every
  // combination of the ambiguous words is tried and the one that lands on the
  // count wins — which is how "a record of the rain" and "to record the rain"
  // are both measured correctly.
  function chooseReading(readings, target) {
    var ambiguous = [];
    readings.forEach(function (r, i) { if (r && r.length > 1) ambiguous.push(i); });

    function flatten(pickOf) {
      var out = [];
      readings.forEach(function (r, i) {
        if (!r) return;
        var p = (pickOf && pickOf[i] != null) ? (r[pickOf[i]] || r[0]) : r[0];
        for (var k = 0; k < p.length; k++) out.push(p[k]);
      });
      return out;
    }

    if (!target || !ambiguous.length || ambiguous.length > 5) return flatten(null);
    var best = null, n = Math.pow(2, ambiguous.length);
    for (var mask = 0; mask < n; mask++) {
      var pickOf = {};
      ambiguous.forEach(function (i, bit) { pickOf[i] = (mask >> bit) & 1; });
      var flat = flatten(pickOf);
      var score = Math.abs(syllables(flat) - target);
      if (!best || score < best.score) best = { score: score, phones: flat };
    }
    return best.phones;
  }

  function analyseLine(line, dict, target) {
    var text = String(line == null ? "" : line);
    var ws = words(text), unknown = [];
    var readings = ws.map(function (w) {
      var p = lookup(w, dict);
      if (!p) { unknown.push(w); return null; }
      return variantsOf(w, dict) || [p];
    });
    var phones = chooseReading(readings, target);
    var counted = syllables(phones) + unknown.length;
    var pattern = stressPattern(phones) + new Array(unknown.length + 1).join("0");
    var script = scriptOf(text);
    return {
      text: text,
      words: ws,
      phones: phones,
      syllables: counted,
      pattern: pattern,
      unknown: unknown,
      script: script,
      // only meaningful in a script that writes its vowels; null in Latin
      matras: script === "latin" ? null : matras(text, script),
      // the pattern is only trustworthy if every word was known
      exact: unknown.length === 0
    };
  }

  // `target` is a syllable count the caller wants a line to reach — a number for
  // every line, or an array of them, one per line. It is only a tie-breaker
  // between readings of the same word; it never changes what a word means.
  function analyse(text, dict, target) {
    var lines = String(text == null ? "" : text).replace(/\r/g, "").split("\n");
    return lines.map(function (line, i) {
      var t = null;
      if (typeof target === "number") t = target;
      else if (target && target.length) t = target[i] || null;
      return analyseLine(line, dict, t);
    });
  }

  /* ------------------------------------------------------------------ */
  /* rhyme                                                              */
  /* ------------------------------------------------------------------ */

  // The rhyme key is the phonemes from the LAST STRESSED vowel to the end.
  // That is what makes "away" rhyme with "say" (EY1) and not with "day" only
  // by accident of spelling: the key is sound, not letters.
  function rhymeKey(phones) {
    if (!phones) return [];
    var last = -1, i;
    for (i = 0; i < phones.length; i++) if (isVowel(phones[i]) && isStressed(phones[i])) last = i;
    if (last < 0) for (i = phones.length - 1; i >= 0; i--) if (isVowel(phones[i])) { last = i; break; }
    return last < 0 ? [] : phones.slice(last);
  }

  function keyString(phones) { return rhymeKey(phones).map(base).join(" "); }
  function skeleton(phones) {
    return rhymeKey(phones).filter(function (p) { return !isVowel(p); }).map(base).join(" ");
  }
  function nucleus(phones) {
    var k = rhymeKey(phones);
    return k.length ? base(k[0]) : "";
  }

  // perfect — the same sound from the last stress onward ("wall" / "fall")
  // near    — the same consonant frame, a different vowel ("cat" / "cot",
  //           "love" / "move")
  // slant   — the same stressed vowel, a different ending ("cat" / "cap")
  function rhymeType(aPhones, bPhones) {
    var ka = rhymeKey(aPhones), kb = rhymeKey(bPhones);
    if (!ka.length || !kb.length) return null;
    if (ka.map(base).join(" ") === kb.map(base).join(" ")) return "perfect";
    if (nucleus(aPhones) === nucleus(bPhones)) return "slant";
    if (skeleton(aPhones) === skeleton(bPhones)) return "near";
    return null;
  }

  // The per-word rhyme facts, computed once per dictionary. Without this the
  // finder re-derived the key, skeleton and syllable count of all 124,000 words
  // on every keystroke.
  var INDEX_CACHE = typeof WeakMap === "function" ? new WeakMap() : null;
  function rhymeIndex(dict) {
    if (INDEX_CACHE && INDEX_CACHE.has(dict)) return INDEX_CACHE.get(dict);
    var rows = Object.keys(dict.words).map(function (w) {
      var p = dict.words[w];
      return { word: w, key: keyString(p), skel: skeleton(p), nuc: nucleus(p), syl: syllables(p) };
    });
    if (INDEX_CACHE) INDEX_CACHE.set(dict, rows);
    return rows;
  }

  // Find rhymes for one word across the whole dictionary.
  // opts: { syllables: n | [min,max], limit }
  function rhymes(word, dict, opts) {
    opts = opts || {};
    var target = lookup(word, dict);
    var out = { word: normalise(word), known: !!target, perfect: [], near: [], slant: [] };
    if (!target) return out;

    var want = opts.syllables;
    var min = 0, max = 99;
    if (typeof want === "number") { min = max = want; }
    else if (want && want.length === 2) { min = want[0]; max = want[1]; }

    var limit = opts.limit || 400;
    var ks = keyString(target), sk = skeleton(target), nu = nucleus(target);
    var tSyl = syllables(target);

    rhymeIndex(dict).forEach(function (row) {
      if (row.word === out.word) return;
      if (row.syl < min || row.syl > max) return;
      var t;
      if (row.key === ks) t = "perfect";
      else if (row.nuc === nu) t = "slant";
      else if (row.skel === sk) t = "near";
      else return;
      if (out[t].length >= limit) return;
      out[t].push({ word: row.word, syllables: row.syl, delta: row.syl - tSyl });
    });

    ["perfect", "near", "slant"].forEach(function (k) {
      out[k].sort(function (a, b) {
        return (Math.abs(a.delta) - Math.abs(b.delta)) || (a.word < b.word ? -1 : 1);
      });
    });
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* metre                                                              */
  /* ------------------------------------------------------------------ */

  var FEET = [
    { id: "iamb", mark: "01", name: "iambic" },
    { id: "trochee", mark: "10", name: "trochaic" },
    { id: "anapest", mark: "001", name: "anapestic" },
    { id: "dactyl", mark: "100", name: "dactylic" },
    { id: "amphibrach", mark: "010", name: "amphibrachic" },
    { id: "spondee", mark: "11", name: "spondaic" },
    { id: "pyrrhic", mark: "00", name: "pyrrhic" }
  ];

  var LENGTHS = ["", "monometer", "dimeter", "trimeter", "tetrameter",
    "pentameter", "hexameter", "heptameter", "octameter"];

  function footById(id) {
    for (var i = 0; i < FEET.length; i++) if (FEET[i].id === id) return FEET[i];
    return null;
  }

  // How many of the feet are exactly the named foot.
  function countFeet(pattern, foot) {
    var mark = foot.mark, n = 0, ok = 0;
    for (var i = 0; i + mark.length <= pattern.length; i += mark.length) {
      n++;
      if (pattern.slice(i, i + mark.length) === mark) ok++;
    }
    return { feet: n, ok: ok };
  }

  // Name the metre when it is regular. Returns null when nothing fits, rather
  // than inventing a name for an irregular line.
  function metre(pattern) {
    if (!pattern || !pattern.length) return null;
    var best = null;
    FEET.forEach(function (foot) {
      var L = foot.mark.length;
      if (pattern.length % L !== 0) return;
      var c = countFeet(pattern, foot);
      if (!c.feet) return;
      var ratio = c.ok / c.feet;
      if (!best || ratio > best.ratio) best = { foot: foot, ratio: ratio, feet: c.feet, ok: c.ok };
    });
    if (!best) return null;
    if (best.ratio < 0.6) return null;
    var lenName = LENGTHS[best.feet] || (best.feet + "-foot");
    return {
      foot: best.foot.id,
      feet: best.feet,
      matched: best.ok,
      regular: best.ratio === 1,
      name: best.foot.name + " " + lenName
    };
  }

  /* ------------------------------------------------------------------ */
  /* fixed forms                                                        */
  /* ------------------------------------------------------------------ */

  var FORMS = {
    free: { id: "free", name: "Free verse", note: "measured, not constrained" },

    haiku: {
      id: "haiku", name: "Haiku",
      note: "three lines, 5 \u00b7 7 \u00b7 5 syllables, no rhyme",
      syllablePattern: [5, 7, 5]
    },
    tanka: {
      id: "tanka", name: "Tanka",
      note: "five lines, 5 \u00b7 7 \u00b7 5 \u00b7 7 \u00b7 7 syllables, no rhyme",
      syllablePattern: [5, 7, 5, 7, 7]
    },
    limerick: {
      id: "limerick", name: "Limerick",
      note: "five lines, 8 \u00b7 8 \u00b7 5 \u00b7 5 \u00b7 8, AABBA \u2014 a guide, because a limerick is sung",
      syllablePattern: [8, 8, 5, 5, 8],
      syllableSlack: 1,
      scheme: "AABBA"
    },

    sonnet: {
      id: "sonnet", name: "Shakespearean sonnet",
      note: "14 lines of iambic pentameter, ABAB CDCD EFEF GG",
      lineCount: 14,
      syllables: 10,
      foot: "iamb",
      // A dictionary stress is not a verse stress: "is" and "a" carry a
      // primary stress in CMUdict that no one beats in a line. So the check is
      // per SYLLABLE against the ideal pattern, with a small allowance, rather
      // than demanding every foot be perfect — which no real sonnet is.
      tolerance: 0.2,
      scheme: "ABABCDCDEFEFGG"
    },
    blank: {
      id: "blank", name: "Blank verse",
      note: "iambic pentameter, unrhymed, any number of lines",
      syllables: 10, foot: "iamb", tolerance: 0.2
    },
    terza: {
      id: "terza", name: "Terza rima",
      note: "iambic pentameter, chained ABA BCB CDC \u2026",
      syllables: 10, foot: "iamb", tolerance: 0.2
    },
    rubaiyat: {
      id: "rubaiyat", name: "Rubaiyat quatrain",
      note: "four lines of iambic pentameter, AABA",
      lineCount: 4, syllables: 10, foot: "iamb", tolerance: 0.2, scheme: "AABA"
    },

    ghazal: {
      id: "ghazal", name: "Ghazal",
      note: "couplets; every line ends on the radif, each couplet rhymes on the qafia before it",
      minLines: 4
    },
    custom: {
      id: "custom", name: "Custom stanza",
      note: "your own line count, syllable counts and rhyme scheme"
    }
  };

  function nonEmpty(lines) {
    return lines.filter(function (l) { return l.words.length > 0; });
  }

  function lastWord(text) {
    var w = words(text);
    return w.length ? w[w.length - 1] : "";
  }

  function wordBefore(text, skipLast) {
    var w = words(text);
    if (w.length < skipLast + 1) return "";
    return w[w.length - 1 - skipLast];
  }

  // Check a rhyme scheme: the lines that share a letter must rhyme, and two
  // DIFFERENT letters must not share a rhyme sound. The second half matters:
  // a sonnet whose B lines and F lines both end in -ay technically rhymes
  // everywhere, and is still wrong — it spends the same sound twice.
  function checkScheme(scheme, lines, issue) {
    var groups = {};
    scheme.split("").forEach(function (letter, i) {
      if (!lines[i]) return;
      (groups[letter] = groups[letter] || []).push(i);
    });
    var letters = Object.keys(groups).sort();
    letters.forEach(function (letter) {
      var idx = groups[letter];
      if (idx.length < 2) return;
      var a = lines[idx[0]];
      for (var j = 1; j < idx.length; j++) {
        var b = lines[idx[j]];
        var t = rhymeType(a.phones, b.phones);
        if (t !== "perfect") {
          issue(b.n, "lines " + a.n + " and " + b.n + " (" + letter + ") do not rhyme" +
            (t ? " \u2014 only a " + t + " rhyme" : ""));
        }
      }
    });
    // the same sound must not serve two letters
    var owner = {};
    letters.forEach(function (letter) {
      var idx = groups[letter];
      if (!idx.length) return;
      var key = rhymeKey(lines[idx[0]].phones).map(base).join(" ");
      if (!key) return;
      if (owner[key] && owner[key].letter !== letter) {
        issue(lines[idx[0]].n, "the sound at the end of line " + lines[idx[0]].n +
          " is already used for the " + owner[key].letter + " lines (" + owner[key].letter +
          " and " + letter + " must sound different)");
      } else if (!owner[key]) {
        owner[key] = { letter: letter, line: lines[idx[0]].n };
      }
    });
  }

  // Check one poem against a form. `opts` carries the custom stanza definition:
  //   { syllables: [10,10,10,10], scheme: "AABB" }
  function check(formId, text, dict, opts) {
    opts = opts || {};
    var form = FORMS[formId] || FORMS.free;
    // the count a line is meant to reach, so an ambiguous word is read to suit it
    var all = analyse(text, dict, form.syllables || form.syllablePattern || null);
    var lines = nonEmpty(all);
    var issues = [];

    function issue(n, msg, level) {
      issues.push({ line: n, msg: msg, level: level || "fail" });
    }

    // per-line facts, always useful
    lines.forEach(function (l, i) {
      l.n = i + 1;
      var m = metre(l.pattern);
      l.metre = m;
      if (l.unknown.length && l.script === "latin") {
        issue(l.n, "not in the dictionary: " + l.unknown.join(", ") +
          " — counted as one syllable each", "warn");
      }
    });

    // A syllable pattern: one count per line, in order.
    if (form.syllablePattern) {
      var slack = form.syllableSlack || 0;
      var want = form.syllablePattern.length;
      if (lines.length !== want) {
        issue(0, "a " + form.name.toLowerCase() + " is " + want + " lines; this is " + lines.length);
      }
      form.syllablePattern.forEach(function (n, i) {
        if (!lines[i]) return;
        var got = lines[i].syllables;
        if (Math.abs(got - n) > slack) {
          issue(i + 1, "line " + (i + 1) + " is " + got + (got === 1 ? " syllable" : " syllables") +
            "; a " + form.name.toLowerCase() + " wants " + n +
            (slack ? " (give or take " + slack + ")" : ""));
        }
      });
    }

    // A line count, and one syllable count for every line of it.
    if (form.lineCount && lines.length !== form.lineCount) {
      issue(0, "a " + form.name.toLowerCase() + " is " + form.lineCount +
        " lines; this is " + lines.length);
    }

    if (form.syllables) {
      var foot = footById(form.foot);
      var tol = form.tolerance || 0.2;
      lines.forEach(function (l) {
        if (l.syllables !== form.syllables) {
          issue(l.n, "line " + l.n + " is " + l.syllables + " syllables; " +
            "a " + form.name.toLowerCase() + " wants " + form.syllables);
        }
        if (!foot) return;
        var ideal = "";
        while (ideal.length < l.pattern.length) ideal += foot.mark;
        ideal = ideal.slice(0, l.pattern.length);
        var off = 0, first = -1;
        for (var i = 0; i < l.pattern.length; i++) {
          if (l.pattern.charAt(i) !== ideal.charAt(i)) {
            off++;
            if (first < 0) first = i;
          }
        }
        var allowed = Math.max(1, Math.round(l.pattern.length * tol));
        if (l.pattern.length && off > allowed) {
          var footNo = Math.floor(first / foot.mark.length) + 1;
          var wantsStress = ideal.charAt(first) === "1";
          issue(l.n, "line " + l.n + " leaves " + foot.name + " metre in " + off + " of " +
            l.pattern.length + " syllables; at most " + allowed + " is allowed. The first " +
            "departure is foot " + footNo + ", where the beat " +
            (wantsStress ? "falls on the second syllable and the line stresses the first"
                         : "falls on the first syllable and the line stresses the second"));
        }
      });
    }

    if (form.scheme) checkScheme(form.scheme, lines, issue);

    // Terza rima is a chain, not a scheme: every line rhymes with the one two
    // before it, and the letters never repeat in a block.
    if (form.id === "terza" && lines.length >= 3) {
      for (var ti = 2; ti < lines.length; ti++) {
        var tt = rhymeType(lines[ti - 2].phones, lines[ti].phones);
        if (tt !== "perfect") {
          issue(lines[ti].n, "terza rima chains every third line: line " + lines[ti].n +
            " must rhyme with line " + lines[ti - 2].n +
            (tt ? " \u2014 only a " + tt + " rhyme" : ""));
        }
      }
    }

    if (form.id === "ghazal") {
      // A ghazal written in Devanagari or Gujarati is measured in matras, not in
      // English phonemes: the couplets share a beher, and the test of that is an
      // equal matra count per line.
      var script = scriptOf(text);
      if (script !== "latin") {
        if (lines.length < form.minLines || lines.length % 2 !== 0) {
          issue(0, "a ghazal is an even number of lines, at least " + form.minLines +
            "; this is " + lines.length);
        }
        var radifM = lines.length ? lastWord(lines[0].text) : "";
        var first = lines.length ? lines[0].matras : 0;
        if (!first) {
          issue(0, "this does not count as verse in " + script + " — no matras found");
        }
        lines.forEach(function (l) {
          if (radifM && lastWord(l.text) !== radifM) {
            issue(l.n, "line " + l.n + " does not end on the radif \u201c" + radifM + "\u201d");
          }
          if (first && l.matras !== first) {
            issue(l.n, "line " + l.n + " has " + l.matras + " matras; the first line has " +
              first + " \u2014 every line of a ghazal shares the same beher");
          }
        });
        var matraFail = issues.filter(function (i) { return i.level === "fail"; });
        return {
          form: form, pass: matraFail.length === 0, lines: lines, issues: issues,
          failed: matraFail.length, warnings: issues.length - matraFail.length,
          script: script, matras: lines.length ? lines[0].matras : 0
        };
      }
      if (lines.length < form.minLines || lines.length % 2 !== 0) {
        issue(0, "a ghazal is an even number of lines, at least " + form.minLines +
          "; this is " + lines.length);
      }
      if (lines.length >= 2) {
        var radif = lastWord(lines[0].text);
        if (!radif) issue(0, "the first line has no radif — the word every line repeats");
        lines.forEach(function (l) {
          if (radif && lastWord(l.text) !== radif) {
            issue(l.n, "line " + l.n + " does not end on the radif \u201c" + radif + "\u201d");
          }
        });
        // each couplet rhymes on the qafia, the word before the radif
        for (var i = 0; i + 1 < lines.length; i += 2) {
          var q1 = lookup(wordBefore(lines[i].text, 1), dict);
          var q2 = lookup(wordBefore(lines[i + 1].text, 1), dict);
          if (!q1 || !q2) continue;
          var tt = rhymeType(q1, q2);
          if (tt !== "perfect") {
            issue(lines[i + 1].n, "couplet " + (i / 2 + 1) + ": the qafia of lines " +
              (lines[i].n) + " and " + lines[i + 1].n + " do not rhyme" +
              (tt ? " — only a " + tt + " rhyme" : ""));
          }
        }
      }
    }

    if (form.id === "custom") {
      var syl = opts.syllables || [];
      if (syl.length && lines.length !== syl.length) {
        issue(0, "this stanza is " + syl.length + " lines; this is " + lines.length);
      }
      syl.forEach(function (want, i) {
        if (!lines[i] || !want) return;
        if (lines[i].syllables !== want) {
          issue(i + 1, "line " + (i + 1) + " is " + lines[i].syllables +
            " syllables; this stanza wants " + want);
        }
      });
      var scheme = String(opts.scheme || "").toUpperCase().replace(/[^A-Z]/g, "");
      if (scheme) checkScheme(scheme, lines, issue);
    }

    var failed = issues.filter(function (i) { return i.level === "fail"; });
    return {
      form: form,
      pass: failed.length === 0,
      lines: lines,
      issues: issues,
      failed: failed.length,
      warnings: issues.length - failed.length
    };
  }

  /* ------------------------------------------------------------------ */
  /* the rhyme scheme as it is being written                            */
  /* ------------------------------------------------------------------ */

  // Work out which lines rhyme with each other, and letter them A, B, C …
  // in order of first appearance. This is what the live gutter shows, so the
  // writer sees the scheme they are actually making rather than the one they
  // meant to make.
  function schemeOf(text, dict, opts) {
    opts = opts || {};
    var lines = nonEmpty(analyse(text, dict));
    var letters = [], groups = [];
    lines.forEach(function (l, i) {
      if (!l.phones.length) { letters.push("\u00b7"); return; }
      for (var g = 0; g < groups.length; g++) {
        if (rhymeType(groups[g].phones, l.phones) === "perfect") {
          groups[g].lines.push(i); letters.push(groups[g].letter); return;
        }
      }
      var letter = String.fromCharCode(65 + groups.length);
      groups.push({ letter: letter, phones: l.phones, lines: [i] });
      letters.push(letter);
    });
    return { letters: letters, groups: groups };
  }

  return {
    VERSION: "1.0.0",
    ALPHABET: ALPHABET,
    parseDict: parseDict,
    words: words,
    normalise: normalise,
    lookup: lookup,
    syllables: syllables,
    stressPattern: stressPattern,
    analyseLine: analyseLine,
    analyse: analyse,
    rhymeKey: rhymeKey,
    rhymeType: rhymeType,
    rhymes: rhymes,
    metre: metre,
    FORMS: FORMS,
    check: check,
    schemeOf: schemeOf,
    scriptOf: scriptOf,
    matras: matras,
    variants: variantsOf
  };
});
