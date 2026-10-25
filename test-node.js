#!/usr/bin/env node
/* test-node.js — the proof for Poet's Studio.
 *
 * The engine is the app: docs/play/index.html is a view over poetry.js, so
 * testing poetry.js tests what the app actually does. Everything here runs
 * offline with no dependencies.
 *
 *     node test-node.js
 *
 * MIT. (c) 2026 Dr Sohil Momin.
 */
"use strict";

var fs = require("fs");
var path = require("path");
var P = require("./docs/play/poetry.js");
var DICT_TEXT = require("./docs/play/dict.js");
var DICT = P.parseDict(DICT_TEXT);

var passed = 0, failed = 0;

function ok(name, cond, detail) {
  if (cond) { passed++; console.log("  ok   " + name); }
  else { failed++; console.log("  FAIL " + name + (detail ? "  <- " + detail : "")); }
}
function eq(name, actual, expected) {
  ok(name + " = " + JSON.stringify(expected), JSON.stringify(actual) === JSON.stringify(expected),
    "got " + JSON.stringify(actual));
}
function section(t) { console.log("\n" + t); }

/* ------------------------------------------------------------------ */
section("the dictionary");

ok("loaded more than 120,000 words", DICT.size > 120000, "size " + DICT.size);
ok("cat is a known word", !!P.lookup("cat", DICT));
ok("the single letter a is a known word", !!P.lookup("a", DICT));
ok("the single letter i is a known word", !!P.lookup("i", DICT));
ok("an apostrophe word is a known word", !!P.lookup("don't", DICT));

// The compact encoding: "my" is M + AY1, which is two characters. An earlier
// decoder guessed "is this encoded or plain?" from the characters and read it
// as the plain phonemes X and 1 — so this assertion is the guard for that bug.
eq("my decodes to M AY1", P.lookup("my", DICT), ["M", "AY1"]);
eq("do decodes to D UW1", P.lookup("do", DICT), ["D", "UW1"]);
eq("cat decodes to K AE1 T", P.lookup("cat", DICT), ["K", "AE1", "T"]);

// plain ARPAbet still parses, so a dictionary can be pasted in by hand
var hand = P.parseDict("zorp Z AO1 R P\nblim B L IH1 M");
eq("a hand-written plain dictionary parses", P.lookup("zorp", hand), ["Z", "AO1", "R", "P"]);

/* ------------------------------------------------------------------ */
section("syllables and stress");

eq("cat has 1 syllable", P.syllables(P.lookup("cat", DICT)), 1);
eq("beautiful has 3 syllables", P.syllables(P.lookup("beautiful", DICT)), 3);
eq("quiet has 2 syllables", P.syllables(P.lookup("quiet", DICT)), 2);
eq("dictionary has 4 syllables", P.syllables(P.lookup("dictionary", DICT)), 4);

eq("cat is stressed", P.stressPattern(P.lookup("cat", DICT)), "1");
eq("before is iambic", P.stressPattern(P.lookup("before", DICT)), "01");
eq("only is trochaic", P.stressPattern(P.lookup("only", DICT)), "10");

var line1 = P.analyseLine("The morning light is soft upon the wall", DICT);
eq("a ten-syllable line counts 10", line1.syllables, 10);
eq("it has no unknown words", line1.unknown, []);

var lineUnk = P.analyseLine("the zorblax sings", DICT);
ok("an unknown word is reported, not dropped", lineUnk.unknown.indexOf("zorblax") >= 0);
ok("an unknown word is still counted as a syllable", lineUnk.syllables === 3,
  "got " + lineUnk.syllables);
ok("a line with an unknown word is marked inexact", lineUnk.exact === false);

/* ------------------------------------------------------------------ */
section("rhyme, by sound");

function rt(a, b) { return P.rhymeType(P.lookup(a, DICT), P.lookup(b, DICT)); }

eq("cat / hat are a perfect rhyme", rt("cat", "hat"), "perfect");
eq("wall / fall are a perfect rhyme", rt("wall", "fall"), "perfect");
eq("day / grey are a perfect rhyme", rt("day", "grey"), "perfect");
eq("say / away are a perfect rhyme", rt("say", "away"), "perfect");
eq("love / move are a near rhyme", rt("love", "move"), "near");
eq("cat / cot are a near rhyme", rt("cat", "cot"), "near");
eq("cat / cap are a slant rhyme", rt("cat", "cap"), "slant");
eq("cat / dog do not rhyme", rt("cat", "dog"), null);
// spelling is not sound: "though" and "cough" look alike and do not rhyme
eq("though / cough do not rhyme", rt("though", "cough"), null);

var r = P.rhymes("cat", DICT);
ok("the finder offers hat for cat", r.perfect.some(function (x) { return x.word === "hat"; }));
ok("the finder never offers the word itself", !r.perfect.some(function (x) { return x.word === "cat"; }));
ok("the finder has all three strengths", r.perfect.length > 0 && r.near.length > 0 && r.slant.length > 0);

var r1 = P.rhymes("cat", DICT, { syllables: 1 });
ok("a syllable filter is honoured", r1.perfect.every(function (x) { return x.syllables === 1; }));
var r5 = P.rhymes("cat", DICT, { syllables: 5 });
ok("a filter that matches nothing returns nothing", r5.perfect.length === 0);
ok("an unknown word is reported as unknown", P.rhymes("zorblax", DICT).known === false);

/* ------------------------------------------------------------------ */
section("metre");

var m1 = P.metre("0101010101");
ok("ten alternating syllables is iambic pentameter", m1 && m1.name === "iambic pentameter",
  m1 && m1.name);
eq("it is called regular", m1 && m1.regular, true);
var m2 = P.metre("1001100110");
ok("the reverse is trochaic pentameter", m2 && m2.name === "trochaic pentameter", m2 && m2.name);
var m3 = P.metre("010101");
ok("six alternating syllables is iambic trimeter", m3 && m3.name === "iambic trimeter", m3 && m3.name);
eq("an irregular line gets no name", P.metre("1010011100"), null);
var m4 = P.metre("1010011110");
ok("a mostly-trochaic line is named but not called regular",
  m4 && m4.name === "trochaic pentameter" && m4.regular === false);

var mL = P.analyseLine("The morning light is soft upon the wall", DICT);
ok("the live line is named iambic pentameter", mL.pattern === "0101110101");

/* ------------------------------------------------------------------ */
section("the sonnet");

var SONNET = [
  "The morning light is soft upon the wall",
  "A single bird begins to call the day",
  "the shadows lengthen slowly down the hall",
  "and all the sleeping gardens turn to grey",
  "my pencil rests a moment in the dust",
  "The kettle sings a thin and patient note",
  "that settles slowly where the hinges rust",
  "and folds its music round my winter coat",
  "the kindness of an empty morning street",
  "and all the quiet words I hold in sight",
  "before the city wakes and brings its heat",
  "and let the evening carry them to light",
  "The page is white; the day has not begun",
  "and there is work to do beneath the sun"
].join("\n");

var son = P.check("sonnet", SONNET, DICT);
ok("a real sonnet passes", son.pass, son.issues.map(function (i) { return i.line + ": " + i.msg; }).join(" | "));
eq("it has 14 lines", son.lines.length, 14);
ok("every line is ten syllables", son.lines.every(function (l) { return l.syllables === 10; }));

// a broken rhyme must fail
var badRhyme = SONNET.split("\n");
badRhyme[3] = "and all the sleeping gardens turn to green";
var br = P.check("sonnet", badRhyme.join("\n"), DICT);
ok("a broken rhyme fails", !br.pass);
ok("and the failure names the lines",
  br.issues.some(function (i) { return /lines 2 and 4/.test(i.msg); }),
  JSON.stringify(br.issues.map(function (i) { return i.msg; })));

// a broken metre must fail
var badMetre = SONNET.split("\n");
badMetre[5] = "the kettle sings a thin and patient note now";
var bm = P.check("sonnet", badMetre.join("\n"), DICT);
ok("an eleven-syllable line fails", !bm.pass);
ok("and the failure names the line and the count",
  bm.issues.some(function (i) { return i.line === 6 && /11 syllables/.test(i.msg); }),
  JSON.stringify(bm.issues.map(function (i) { return i.line + ":" + i.msg; })));

// the same rhyme sound must not serve two letters: this is the sonnet above
// with its F lines changed back to -ay, which is the B sound. Every pair still
// rhymes, and the poem is still wrong.
var reused = SONNET.split("\n");
reused[9] = "and all the quiet words I meant to say";
reused[11] = "and let the evening carry them away";
var ru = P.check("sonnet", reused.join("\n"), DICT);
ok("reusing the B rhyme sound for F fails", !ru.pass);
ok("and the failure says the sound is already used",
  ru.issues.some(function (i) { return /already used for the B lines/.test(i.msg); }),
  JSON.stringify(ru.issues.map(function (i) { return i.line + ":" + i.msg; })));

// thirteen lines must fail
var short = SONNET.split("\n").slice(0, 13).join("\n");
ok("a thirteen-line sonnet fails", !P.check("sonnet", short, DICT).pass);

/* ------------------------------------------------------------------ */
section("the haiku");

var haiku = ["the old pond settles", "a frog jumps in the water", "the sound of the splash"].join("\n");
var h = P.check("haiku", haiku, DICT);
ok("a 5-7-5 haiku passes", h.pass, h.issues.map(function (i) { return i.msg; }).join(" | "));

var badHaiku = ["the old pond settles", "a frog jumps into the water", "the sound of the splash"].join("\n");
var bh = P.check("haiku", badHaiku, DICT);
ok("an 8-syllable middle line fails", !bh.pass);
ok("and the failure says so", bh.issues.some(function (i) { return i.line === 2; }));

ok("two lines are not a haiku",
  !P.check("haiku", "the old pond settles\nthe sound of the splash", DICT).pass);

/* ------------------------------------------------------------------ */
section("the ghazal");

var GHAZAL = [
  "we listen to the rain and wait tonight",
  "and let the dark decide our fate tonight",
  "the candle keeps a small and steady light tonight",
  "and every quiet room is bright tonight"
].join("\n");
var g = P.check("ghazal", GHAZAL, DICT);
ok("a ghazal with a radif and rhyming qafias passes", g.pass,
  g.issues.map(function (i) { return i.line + ": " + i.msg; }).join(" | "));

var badGhazal = GHAZAL.split("\n");
badGhazal[1] = "and let the dark decide our fate tomorrow";
var bg = P.check("ghazal", badGhazal.join("\n"), DICT);
ok("a line that leaves the radif fails", !bg.pass);
ok("and the failure names the radif",
  bg.issues.some(function (i) { return /radif/.test(i.msg); }),
  JSON.stringify(bg.issues.map(function (i) { return i.msg; })));

ok("three lines are not a ghazal",
  !P.check("ghazal", GHAZAL.split("\n").slice(0, 3).join("\n"), DICT).pass);

/* ------------------------------------------------------------------ */
section("a custom stanza");

var stanza = "the morning comes\nand then the light\nis gone";
var cs = P.check("custom", stanza, DICT, { syllables: [4, 4, 2], scheme: "" });
ok("a stanza that matches its own counts passes", cs.pass,
  cs.issues.map(function (i) { return i.msg; }).join(" | "));
var csBad = P.check("custom", stanza, DICT, { syllables: [5, 4, 2], scheme: "" });
ok("a stanza that does not match fails", !csBad.pass);

/* ------------------------------------------------------------------ */
section("the scheme as written");

var sc = P.schemeOf(SONNET, DICT);
eq("the sonnet's scheme is read back as ABABCDCDEFEFGG", sc.letters.join(""), "ABABCDCDEFEFGG");

/* ------------------------------------------------------------------ */
section("the app ships what it says it ships");

var dir = path.join(__dirname, "docs", "play");
["index.html", "poetry.js", "dict.js", "web-kit.js", "search-kit.js", "export-kit.js"].forEach(function (f) {
  ok("docs/play/" + f + " exists", fs.existsSync(path.join(dir, f)));
});
var html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
["poetry.js", "dict.js", "web-kit.js", "search-kit.js", "export-kit.js"].forEach(function (f) {
  ok("the app loads " + f, html.indexOf('src="' + f + '"') >= 0);
});
ok("the app makes no network request", !/https?:\/\//.test(html.replace(/https?:\/\/[^"'\s]*w3\.org[^"'\s]*/g, "")));

/* ------------------------------------------------------------------ */
console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
