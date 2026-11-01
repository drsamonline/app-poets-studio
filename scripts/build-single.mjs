#!/usr/bin/env node
/* build-single.mjs — one file, no build step, no dependencies.
 *
 *     node scripts/build-single.mjs      ->  dist/poets-studio.html
 *
 * The app is already six files that sit beside each other. This inlines them so
 * the whole workshop — engine, dictionary, samples, storage, export — is a
 * single HTML file you can email, put on a USB stick, or open from `file://` on
 * a machine that has never seen the internet.
 *
 * Two things are removed on purpose, because a single file has no siblings:
 * the web manifest and the service worker registration (which the app only
 * attempts when a manifest link is present). The icon link goes too — an icon
 * that 404s is worse than no icon.
 *
 * No dependencies. MIT. (c) 2026 Dr Sohil Momin.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const src = path.join(root, "docs", "play");
const outDir = path.join(root, "dist");

const SCRIPTS = ["web-kit.js", "export-kit.js", "poetry.js", "dict.js", "samples.js"];

let html = fs.readFileSync(path.join(src, "index.html"), "utf8");

for (const file of SCRIPTS) {
  const tag = `<script src="${file}"></script>`;
  if (!html.includes(tag)) throw new Error(`expected ${tag} in index.html`);
  const code = fs.readFileSync(path.join(src, file), "utf8");
  // a function replacement, so "$&" in the bundled code is never a pattern
  html = html.replace(tag, () => `<script>\n/* ${file} */\n${code}\n</script>`);
}

html = html
  .replace(/<link rel="manifest"[^>]*>\n?/, "")
  .replace(/<link rel="icon"[^>]*>\n?/, "");

fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, "poets-studio.html");
fs.writeFileSync(out, html, "utf8");

const kb = (n) => (n / 1024).toFixed(0) + " KB";
console.log(`wrote ${path.relative(root, out)} (${kb(Buffer.byteLength(html))})`);

// the promises the single file has to keep
const bad = [];
if (/<script src=/.test(html)) bad.push("a script is still external");
if (/<link[^>]+rel="manifest"/.test(html)) bad.push("the manifest link survived");
if (/https?:\/\//.test(html.replace(/https?:\/\/[^"'\s]*w3\.org[^"'\s]*/g, ""))) bad.push("an absolute URL survived");
if (bad.length) {
  console.error("single-file build is not self-contained: " + bad.join(", "));
  process.exit(1);
}
console.log("self-contained: no external script, no manifest, no absolute URL");
