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
    var words = {}, size = 0;
    String(text).split("\n").forEach(function (line) {
      line = line.replace(/\r$/, "");
      if (!line || line.charAt(0) === "#") return;
      var tab = line.indexOf("\t"), w, rest;
      if (tab > 0) {
        w = line.slice(0, tab);
        words[w] = decodePhones(line.slice(tab + 1));
      } else {
        var sp = line.indexOf(" ");
        if (sp < 1) return;
        w = line.slice(0, sp);
        words[w] = line.slice(sp + 1).split(/\s+/);
      }
      size++;
    });
    return { words: words, size: size };
  }

  var PUNCT = /^[^A-Za-z']+|[^A-Za-z']+$/g;

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

  function lookup(word, dict) {
    var w = normalise(word);
    return (dict && dict.words && dict.words[w]) || null;
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
  function analyseLine(line, dict) {
    var ws = words(line), phones = [], unknown = [];
    ws.forEach(function (w) {
      var p = lookup(w, dict);
      if (p) { for (var i = 0; i < p.length; i++) phones.push(p[i]); }
      else { unknown.push(w); }
    });
    var counted = syllables(phones) + unknown.length;
    var pattern = stressPattern(phones) + new Array(unknown.length + 1).join("0");
    return {
      text: String(line == null ? "" : line),
      words: ws,
      phones: phones,
      syllables: counted,
      pattern: pattern,
      unknown: unknown,
      // the pattern is only trustworthy if every word was known
      exact: unknown.length === 0
    };
  }

  function analyse(text, dict) {
    return String(text == null ? "" : text)
      .replace(/\r/g, "")
      .split("\n")
      .map(function (line) { return analyseLine(line, dict); });
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
      note: "three lines, 5 · 7 · 5 syllables, no rhyme",
      syllablePattern: [5, 7, 5]
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
      scheme: "ABAB CDCD EFEF GG".replace(/ /g, "").split("")
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
    var all = analyse(text, dict);
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
      if (l.unknown.length) {
        issue(l.n, "not in the dictionary: " + l.unknown.join(", ") +
          " — counted as one syllable each", "warn");
      }
    });

    if (form.id === "haiku") {
      if (lines.length !== 3) issue(0, "a haiku is three lines; this is " + lines.length);
      form.syllablePattern.forEach(function (want, i) {
        if (!lines[i]) return;
        if (lines[i].syllables !== want) {
          issue(i + 1, "line " + (i + 1) + " is " + lines[i].syllables +
            " syllables; a haiku wants " + want);
        }
      });
    }

    if (form.id === "sonnet") {
      if (lines.length !== form.lineCount) {
        issue(0, "a sonnet is " + form.lineCount + " lines; this is " + lines.length);
      }
      var foot = footById(form.foot);
      lines.forEach(function (l) {
        if (l.syllables !== form.syllables) {
          issue(l.n, "line " + l.n + " is " + l.syllables + " syllables; " +
            "iambic pentameter wants " + form.syllables);
        }
        var ideal = "";
        while (ideal.length < l.pattern.length) ideal += foot.mark;
        ideal = ideal.slice(0, l.pattern.length);
        var off = 0;
        for (var i = 0; i < l.pattern.length; i++) if (l.pattern.charAt(i) !== ideal.charAt(i)) off++;
        var allowed = Math.max(1, Math.round(l.pattern.length * form.tolerance));
        if (l.pattern.length && off > allowed) {
          issue(l.n, "line " + l.n + " leaves iambic pentameter in " + off +
            " of " + l.pattern.length + " syllables; at most " + allowed + " is allowed");
        }
      });
      checkScheme(form.scheme.join(""), lines, issue);
    }

    if (form.id === "ghazal") {
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
    schemeOf: schemeOf
  };
});
