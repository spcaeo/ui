/**
 * Colour maths and stylesheet parsing, shared by every component.
 *
 * Kept deliberately dependency-free and separate from the CLI so a new
 * component only has to describe its own colour pairs, never re-implement
 * OKLCH conversion or the WCAG formula.
 */
import { readFileSync } from "node:fs";

const srgb = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
export const clamp = (v) => Math.min(1, Math.max(0, v));

/** OKLCH -> linear sRGB. Standard matrices; verified against known shadcn tokens. */
export function oklchToLinear(L, C, hDeg) {
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

export const hex = (c) =>
  "#" +
  oklchToLinear(...c)
    .map((v) =>
      Math.round(clamp(srgb(v)) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");

export const luminance = (c) => {
  const [r, g, b] = oklchToLinear(...c);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/**
 * WCAG 2.x contrast ratio.
 *
 * The flat 0.05 term on BOTH sides is the reason a dark theme cannot put three
 * dark fills 3:1 apart: near black that constant dominates the actual
 * difference. It is not a bug in this code, it is the specification.
 */
export const ratio = (A, B) => {
  const a = luminance(A);
  const b = luminance(B);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
};

/**
 * Pull `--<prefix>-<name>: oklch(L C H)` declarations out of one CSS block.
 * Reads the stylesheet rather than a copy of the values, so the numbers a
 * component publishes can never drift from the ones it ships.
 */
export function readVars(css, selector, prefix) {
  const at = css.indexOf(selector);
  if (at < 0) throw new Error(`selector not found: ${selector}`);
  const open = css.indexOf("{", at);
  const body = css.slice(open + 1, css.indexOf("}", open));
  const vars = {};
  /*
    Match the whole declaration, then find the first oklch() inside its value.
    That handles a plain `--x: oklch(...)` and also the host-theme interop form
    `--x: var(--background, oklch(...))`, where the oklch is the FALLBACK — the
    colour that actually renders when no host design system is present.

    That fallback is the only thing we can honestly measure. If a host theme is
    supplying the real colours, the host owns the contrast, and claiming a ratio
    for colours we did not define would be exactly the unverified assertion this
    tool exists to prevent.
  */
  const decl = new RegExp(`--${prefix}-([a-z-]+)\\s*:\\s*([^;]+)`, "g");
  const oklchRe = /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/;
  for (const [, name, value] of body.matchAll(decl)) {
    const hit = value.match(oklchRe);
    if (hit) vars[name] = [Number(hit[1]), Number(hit[2]), Number(hit[3])];
  }
  if (!Object.keys(vars).length) throw new Error(`no --${prefix}-* oklch vars under ${selector}`);
  return vars;
}

export const loadCss = (file) => readFileSync(file, "utf8");

/**
 * Evaluate one component's contrast spec.
 *
 * `text` pairs are flat requirements. `boundary` pairs pass if EITHER the two
 * fills differ enough OR a named edge stroke reads against both — the either/or
 * is what lets a genuinely dark theme conform to WCAG 1.4.11 at all.
 */
export function evaluate(themes, spec) {
  const out = {};
  for (const [theme, vars] of Object.entries(themes)) {
    const rows = [];
    for (const t of spec.text) {
      const v = ratio(vars[t.fg], vars[t.bg]);
      const need = t.need ?? 4.5;
      rows.push({ label: t.label, need, ok: v >= need, note: v.toFixed(2) });
    }
    for (const b of spec.boundaries) {
      const need = b.need ?? 3.0;
      const byFill = ratio(vars[b.a], vars[b.b]);
      const byEdge = b.edge
        ? Math.min(ratio(vars[b.edge], vars[b.a]), ratio(vars[b.edge], vars[b.b]))
        : 0;
      rows.push({
        label: b.label,
        need,
        boundary: true,
        ok: byFill >= need || byEdge >= need,
        note:
          byFill >= need
            ? `${byFill.toFixed(2)} by fill`
            : `${byFill.toFixed(2)} by fill — **${byEdge.toFixed(2)}** by edge`,
      });
    }
    out[theme] = rows;
  }
  return out;
}
