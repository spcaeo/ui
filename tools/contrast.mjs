#!/usr/bin/env node
/**
 * Re-measure the control's contrast, reading the REAL values out of
 * folder-tabs.css so the numbers can never drift from the stylesheet.
 *
 *   node tools/contrast.mjs            print the table
 *   node tools/contrast.mjs --check    exit 1 if a requirement fails
 *
 * WHAT IS ENFORCED, and why it is not simply "everything >= 3":
 *
 *   Text needs 4.5:1 (WCAG 1.4.3) and that is enforced flatly.
 *
 *   A BOUNDARY needs 3:1 (WCAG 1.4.11), but it may be carried EITHER by the two
 *   fills differing OR by the --tab-edge stroke reading against both of them.
 *   That either/or matters: three genuinely dark fills cannot all sit 3:1 apart,
 *   because WCAG 2.x adds a flat 0.05 flare term to both sides of the ratio,
 *   which swamps any difference near black. A #333 panel cannot reach 3:1
 *   against a rail even if that rail is pure black — the ceiling is 1.66. Dark
 *   mode therefore carries its boundaries on the stroke, exactly as the original
 *   Visual Basic control carried them on a 3D border.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(root, "folder-tabs.css"), "utf8");

// --- colour ---------------------------------------------------------------
const srgb = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
const clamp = (v) => Math.min(1, Math.max(0, v));

function oklchToLinear(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map(clamp);
}
const hex = (c) =>
  "#" +
  oklchToLinear(...c)
    .map((v) =>
      Math.round(clamp(srgb(v)) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
const luminance = (c) => {
  const [r, g, b] = oklchToLinear(...c);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (A, B) => {
  const a = luminance(A),
    b = luminance(B);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
};

// --- read the stylesheet --------------------------------------------------
function readBlock(selector) {
  const at = css.indexOf(selector);
  if (at < 0) throw new Error(`selector not found in folder-tabs.css: ${selector}`);
  const open = css.indexOf("{", at);
  const body = css.slice(open + 1, css.indexOf("}", open));
  const vars = {};
  for (const [, name, L, C, H] of body.matchAll(
    /--tab-([a-z-]+)\s*:\s*oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/g,
  ))
    vars[name] = [Number(L), Number(C), Number(H)];
  return vars;
}
const themes = { light: readBlock(":root {"), dark: readBlock(".dark,") };

// --- the requirements -----------------------------------------------------
const TEXT = [
  ["label on inactive tab", (t) => ratio(t["rail-ink"], t["rail-fill"])],
  ["label on active tab", (t) => ratio(t["panel-ink"], t.panel)],
  ["focus ring on inactive tab", (t) => ratio(t.ring, t["rail-fill"]), 3.0],
  ["focus ring on active tab", (t) => ratio(t["ring-on-panel"], t.panel), 3.0],
];
const BOUNDARIES = [
  ["inactive tab vs rail", "rail-fill", "rail"],
  ["active tab vs rail", "panel", "rail"],
  ["active tab vs inactive tab", "panel", "rail-fill"],
];

let failed = false;
const say = (ok, line) => {
  if (!ok) failed = true;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${line}`);
};

for (const [name, t] of Object.entries(themes)) {
  console.log(`\n===== ${name.toUpperCase()} =====`);
  for (const [k, v] of Object.entries(t)) {
    console.log(`  --tab-${k.padEnd(13)} ${hex(v)}  oklch(${v.join(" ")})`);
  }
  console.log("  " + "-".repeat(62));

  for (const [label, fn, need = 4.5] of TEXT) {
    const v = fn(t);
    say(v >= need, `${label.padEnd(28)} ${v.toFixed(2).padStart(6)}  (needs ${need})`);
  }

  for (const [label, a, b] of BOUNDARIES) {
    const byFill = ratio(t[a], t[b]);
    const byEdge = Math.min(ratio(t.edge, t[a]), ratio(t.edge, t[b]));
    const ok = byFill >= 3.0 || byEdge >= 3.0;
    const how =
      byFill >= 3.0
        ? `fill ${byFill.toFixed(2)}`
        : `fill ${byFill.toFixed(2)} — carried by edge ${byEdge.toFixed(2)}`;
    say(ok, `${label.padEnd(28)} ${how}  (needs 3.0 by fill OR edge)`);
  }
}

console.log("");
if (failed) {
  console.error("Contrast requirements NOT met. Fix the fills in folder-tabs.css.\n");
  process.exit(1);
}
console.log("All contrast requirements met.\n");
