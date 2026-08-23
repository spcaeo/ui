#!/usr/bin/env node
/**
 * Inline `vanilla/folder-tabs.js` into `demo.html` between the FLDR:INLINE
 * markers.
 *
 * WHY: demo.html must work when double-clicked from a file manager, and file://
 * refuses ES module imports on CORS grounds. Copying the source by hand is how
 * the two silently drift, so it is generated instead — and `--check` lets CI
 * fail the build the moment they disagree.
 *
 *   node tools/build-demo.mjs           write demo.html
 *   node tools/build-demo.mjs --check   exit 1 if demo.html is stale
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const START =
  "/* FLDR:INLINE:START — generated from vanilla/folder-tabs.js. Do not edit by hand. */";
const END = "/* FLDR:INLINE:END */";

const source = readFileSync(join(root, "vanilla/folder-tabs.js"), "utf8")
  .replace(/^export default .*$/m, "")
  .replace(/^export /gm, "")
  .trimEnd();

const html = readFileSync(join(root, "demo.html"), "utf8");
const from = html.indexOf(START);
const to = html.indexOf(END);
if (from < 0 || to < 0) {
  console.error("demo.html is missing the FLDR:INLINE markers.");
  process.exit(1);
}

const next = html.slice(0, from + START.length) + "\n" + source + "\n" + html.slice(to);

if (process.argv.includes("--check")) {
  if (next !== html) {
    console.error("demo.html is out of date with vanilla/folder-tabs.js.\nRun: npm run build:demo");
    process.exit(1);
  }
  console.log("demo.html is in sync with vanilla/folder-tabs.js");
} else {
  writeFileSync(join(root, "demo.html"), next);
  console.log(`demo.html updated (${source.split("\n").length} lines inlined)`);
}
