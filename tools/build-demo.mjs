#!/usr/bin/env node
/**
 * Inline a component's vanilla source into its demo page, between the markers
 * that component declares in its component.json.
 *
 * WHY: a demo must work when double-clicked from a file manager, and file://
 * refuses ES module imports on CORS grounds. Copying the source by hand is how
 * the two silently drift, so it is generated instead — and `--check` lets CI
 * fail the build the moment they disagree.
 *
 *   npm run build:demo                 every component
 *   npm run build:demo folder-tabs     just one
 *   npm run check:demo                 verify without writing
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { selected } from "./lib/components.mjs";

const argv = process.argv.slice(2);
const check = argv.includes("--check");
let stale = false;
let did = 0;

for (const component of selected(argv)) {
  const cfg = component.demoInline;
  if (!cfg) continue;

  const source = readFileSync(join(component.dir, cfg.source), "utf8")
    .replace(/^export default .*$/m, "")
    .replace(/^export /gm, "")
    .trimEnd();

  const target = join(component.dir, cfg.target);
  const html = readFileSync(target, "utf8");
  const from = html.indexOf(cfg.startMarker);
  const to = html.indexOf(cfg.endMarker);
  if (from < 0 || to < 0) {
    console.error(`${component.name}: ${cfg.target} is missing its inline markers.`);
    process.exit(1);
  }

  const next = html.slice(0, from + cfg.startMarker.length) + "\n" + source + "\n" + html.slice(to);
  did++;

  if (check) {
    if (next !== html) {
      stale = true;
      console.error(`  STALE       ${component.name}/${cfg.target} — run: npm run build:demo`);
    } else {
      console.log(`  in sync     ${component.name}/${cfg.target}`);
    }
  } else {
    writeFileSync(target, next);
    console.log(
      `  written     ${component.name}/${cfg.target} (${source.split("\n").length} lines inlined)`,
    );
  }
}

if (!did) console.log("  no component declares a demoInline block.");
if (stale) process.exit(1);
