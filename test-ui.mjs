#!/usr/bin/env node
/* test-ui.mjs — does the app actually BOOT?
 *
 * test-node.js proves the engine. This proves the page: that index.html loads
 * its five scripts, parses the 124,085-word dictionary, measures a sonnet,
 * finds a rhyme and saves a draft — in a real DOM, not in a stub.
 *
 * It needs jsdom, which is NOT a dependency of the app (the app has none, and
 * must keep none). So it skips itself, loudly, when jsdom is absent:
 *
 *     npm i jsdom && node test-ui.mjs
 *
 * A skipped check is reported as skipped, never as a pass.
 *
 * MIT. (c) 2026 Dr Sohil Momin.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(here, "docs", "play");

let JSDOM;
try {
  ({ JSDOM } = await import("jsdom"));
} catch {
  console.log("SKIPPED: jsdom is not installed. Run `npm i jsdom` to check the page boots.");
  process.exit(0);
}

let passed = 0, failed = 0;
function ok(name, cond, detail) {
  if (cond) { passed++; console.log("  ok   " + name); }
  else { failed++; console.log("  FAIL " + name + (detail ? "  <- " + detail : "")); }
}

const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join("\n");

// The page is loaded with its scripts REMOVED and then replayed in the order the
// page lists them. Loading it whole would run the inline block before the kits
// exist (jsdom does not fetch file:// subresources), which is a harness artefact
// that looks exactly like an app bug. This way each script runs once, in order.
const shell = html
  .replace(/<script src="[^"]*"><\/script>/g, "")
  .replace(/<script>[\s\S]*?<\/script>/g, "");

const dom = new JSDOM(shell, {
  url: "https://example.test/play/",
  runScripts: "dangerously",
  pretendToBeVisual: true
});
const w = dom.window;
const d = w.document;

let bootError = null;
try {
  for (const f of ["web-kit.js", "export-kit.js", "poetry.js", "dict.js"]) {
    const s = d.createElement("script");
    s.textContent = fs.readFileSync(path.join(dir, f), "utf8");
    d.head.appendChild(s);
  }
  const s = d.createElement("script");
  s.textContent = inline;
  d.body.appendChild(s);
} catch (e) { bootError = e; }

ok("the page boots without throwing", !bootError, bootError && bootError.message);
ok("it exposes its state for inspection", !!w.PoetsStudio);
if (!w.PoetsStudio) { console.log("\n" + passed + " passed, " + failed + " failed"); process.exit(1); }

ok("the dictionary parsed", w.PoetsStudio.dict.size > 120000, "size " + w.PoetsStudio.dict.size);
ok("the footer reports the dictionary size",
  /124,\d{3} words/.test(d.getElementById("dictinfo").textContent),
  d.getElementById("dictinfo").textContent);
ok("all five forms are offered", d.querySelectorAll("#form option").length === 5);

const SONNET = `The morning light is soft upon the wall
A single bird begins to call the day
the shadows lengthen slowly down the hall
and all the sleeping gardens turn to grey
my pencil rests a moment in the dust
The kettle sings a thin and patient note
that settles slowly where the hinges rust
and folds its music round my winter coat
the kindness of an empty morning street
and all the quiet words I hold in sight
before the city wakes and brings its heat
and let the evening carry them to light
The page is white; the day has not begun
and there is work to do beneath the sun`;

d.getElementById("poem").value = SONNET;
d.getElementById("form").value = "sonnet";
w.PoetsStudio.measure();

ok("the measure shows one row per line", d.querySelectorAll("#measure .row").length === 14,
  d.querySelectorAll("#measure .row").length + " rows");
ok("the verdict is a pass", d.getElementById("verdict").className.indexOf("pass") >= 0,
  d.getElementById("verdict").textContent);

d.getElementById("word").value = "cat";
w.PoetsStudio.rhymes();
const chips = [...d.querySelectorAll("#rhyme-out .chip")].map((c) => c.getAttribute("data-w"));
ok("the rhyme finder fills in", chips.length > 0, chips.length + " chips");
ok("and offers hat for cat", chips.includes("hat"));

d.getElementById("title").value = "ui test";
d.getElementById("savenew").click();
ok("a draft is saved", w.PoetsStudio.drafts().length === 1);
ok("and listed in the journal", d.querySelectorAll("#drafts li").length === 1);

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
