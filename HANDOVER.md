# Handover

Everything a future session needs to pick this up cold. Written 2026-08-23.

If you read only one section, read **[The WCAG dark-mode ceiling](#the-wcag-dark-mode-ceiling)**
— it is the non-obvious constraint that shaped the whole design, and it will
apply to every component added here.

---

## 1. What this is

`github.com/spcaeo/ui` — a collection of UI components with an unusual promise:
**the accessibility claims are computed from the source and enforced in CI**, not
asserted in a README. One component exists so far (`folder-tabs`); the tooling is
component-agnostic and built for more.

|           |                                                                            |
| --------- | -------------------------------------------------------------------------- |
| Repo      | https://github.com/spcaeo/ui                                               |
| Docs      | https://spcaeo.github.io/ui/                                               |
| Licence   | MIT, © 2026 spcaeo                                                         |
| Developer | [Space-O Technologies](https://www.spaceo.ca)                              |
| Node      | 22 (`.nvmrc`); works on ≥18                                                |
| Release   | `v1.0.0` (tagged while the repo was still named `vb-inspired-folder-tabs`) |

**Local checkout is `~/Desktop/ui`**, matching the repo name. It was originally
`~/Desktop/folder-tabs`; if an old terminal or editor still points there, reopen
it at the new path.

## 2. How it got here

A single folder of five files ("folder tabs, extracted from another project")
was reviewed, fixed, restructured and published in one session:

1. **Review** found 7 issues, from a broken demo to undeclared dependencies.
2. **Measuring the contrast** to fix them uncovered a much worse one: the
   README's dark-mode numbers were wrong, and the shipped palette failed WCAG in
   a way that could not be fixed by adjusting fills. See §4.
3. **Fixed, tested, packaged, published** as `vb-inspired-folder-tabs` v1.0.0.
4. **Restructured** into this multi-component collection and renamed to `ui`.

Two things are worth knowing about that history:

- The original author's comments were unusually good — they explain _why_, and
  they record mistakes that were made and corrected. **Preserve that voice.** When
  editing, keep explaining the reasoning, not just the behaviour.
- Several "facts" in the original README turned out to be wrong when measured.
  Assume nothing is verified until a script verifies it. That is why the tooling
  exists.

## 3. The folder-tabs mechanic

The domain knowledge that makes this component work, and the thing to protect:

> **Three fills in a fixed relationship.** The rail is darkest. An inactive tab
> sits above it. The active tab is _exactly_ the panel's fill.

The active tab is not _marked_ as selected — it **is** the panel, continuing
upward, like one sheet of paper. Rebuilt from the Visual Basic 4 `SSTab` control.

Two consequences, both load-bearing:

- **It survives greyscale.** Shape plus shared fill carry the state, so it reads
  on a mono print, on a bad monitor, and for a colourblind user. A tint does none
  of that. There is a screenshot proving it: `greyscale-proof.png`.
- **The panel must exist.** Give the panel a different ground, or remove it, and
  the join disappears. The `flush` variant tightens padding but deliberately
  **keeps the walls** for this reason.

**The dark-mode trap:** the active tab must stay the _lightest_ of the three,
because it is the panel. Borrow a card colour that happens to be darker than the
tab fill and the selected tab reads as pressed _in_ while the unselected ones
read as raised — exactly backwards.

## 4. The WCAG dark-mode ceiling

**This is the most important thing in this document.**

WCAG 2.x contrast is `(L_lighter + 0.05) / (L_darker + 0.05)`. That flat `0.05`
flare term is added to _both_ sides. Near black it dominates the actual
difference, which produces a hard ceiling:

> **Three genuinely dark fills cannot all sit 3:1 apart.** A `#333` panel cannot
> reach 3:1 against a rail **even if that rail is pure black** — the ceiling is
> **1.66**. To pass on fill alone the panel must climb to roughly `#5d5d5d`, at
> which point it is not a dark mode any more.

The original stylesheet hit exactly this wall. Its shipped dark palette measured:

| pair                   | claimed in README | actually measured |
| ---------------------- | ----------------- | ----------------- |
| label on inactive tab  | 4.53              | **11.87**         |
| inactive tab vs rail   | 3.23              | **1.15**          |
| active vs inactive tab | (not stated)      | **1.31**          |

So in dark mode you could not tell by contrast which tab was selected.

**The fix, and the pattern to reuse:** carry the boundary on a **stroke** rather
than on the fill difference. `--tab-edge` is measured against every surface it
touches. This is what the original Windows-era controls did with their 3D
borders, so it is also more faithful, not a compromise.

The enforced rule is therefore an either/or:

> Text needs 4.5:1, flatly. A **boundary** needs 3:1 **by fill OR by edge**.

`tools/contrast.mjs` implements exactly that. When you add a component with a
dark theme, expect to need an edge variable. Budget for it in the design.

### Current measured values (folder-tabs)

Regenerate with `npm run contrast`; never copy these by hand.

|                            | light         | dark                         |
| -------------------------- | ------------- | ---------------------------- |
| label on inactive tab      | 5.34          | 12.64                        |
| label on active tab        | 19.79         | 8.82                         |
| focus ring on inactive tab | 5.66          | 13.43                        |
| focus ring on active tab   | 13.64         | 7.96                         |
| inactive tab vs rail       | 3.02 by fill  | 1.23 fill → **5.82 by edge** |
| active tab vs rail         | 18.11 by fill | 2.08 fill → **3.45 by edge** |
| active tab vs inactive tab | 6.00 by fill  | 1.69 fill → **3.45 by edge** |

Note **two** focus-ring variables. One ring colour cannot clear 3:1 against both
a mid-grey inactive tab and a white panel, so `--tab-ring` is for inactive tabs
and `--tab-ring-on-panel` for the active tab. Expect the same problem elsewhere.

## 5. Bugs found, and why each mattered

Kept because each one is a category of mistake, not a one-off:

| Bug                                                              | Why it mattered                                                                                                                                      |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Only the first generated tab had `aria-controls`                 | Selecting any other overflow tab hid the panel entirely, leaving the rail floating above nothing — the exact failure the component exists to prevent |
| Panels had no `role="tabpanel"`, `aria-labelledby` or `tabindex` | A screen reader announced the tabs then landed in an anonymous `div`                                                                                 |
| `scrollIntoView` used to reveal a focused tab                    | It scrolls **every** scrollable ancestor including the document, so arrow-keying a tab strip dragged the whole page                                  |
| `focus()` without `preventScroll`                                | Same problem from the other direction: the browser's own scroll-into-view fired before ours                                                          |
| React imported `lucide-react`, `cn` and Tailwind                 | README declared only Radix. Undeclared deps break installs for everyone but the author                                                               |
| `NestedContext` created, provided, never read                    | Dead code implying a mechanism that did not exist                                                                                                    |
| Comment pointed at a `globals.css` that does not exist here      | Copied from the origin project                                                                                                                       |
| Dark-mode contrast table fabricated                              | See §4                                                                                                                                               |
| `aria-disabled` tabs not styled _(introduced during the fix)_    | CSS matched only `:disabled`. Caught by looking at a screenshot                                                                                      |

**Two of those were mine, caught by testing rather than by reading.** Take the
hint: screenshot the result and drive the real thing.

## 6. Tooling contracts

All tools live in `tools/`, are component-agnostic, and take an optional
component name (`npm test folder-tabs`). They discover components by scanning
`components/*/component.json`.

### `tools/contrast.mjs`

Parses the component's CSS, measures every declared pair, and **generates** the
markdown table into every file listed in `contrast.tables`, between
`<!-- CONTRAST:START -->` and `<!-- CONTRAST:END -->`.

- `--sync` writes the tables. `--check` verifies ratios **and** tables (CI).
- Content between the markers is overwritten. Never hand-edit it.
- Measure the `oklch()` declarations, **not** the sRGB hexes in the `@supports`
  block — those are rounded and disagree in the second decimal, which is enough
  to flip a boundary sitting on 3.02. A previous pass got this wrong and produced
  two contradicting published tables.

### `tools/build-demo.mjs`

Inlines a component's vanilla source into its `demo.html` between the markers the
component declares. `--check` fails CI if they drift.

**Why inline at all:** `file://` refuses ES module imports on CORS grounds. A
demo that only works behind a web server gets reported as a bug. Generating it
means the copy can never silently diverge — which it already had once.

### `tools/smoke-test.mjs`

Launches Chromium, opens each component's `demo.html`, and calls that
component's `test.mjs` default export with `{ page, check, component, url }`.

Tests are **behavioural on purpose**. Every bug this collection has shipped was
an interaction bug; none would have been caught by asserting a return value.

### `tools/screenshots.mjs`

Serves the repo over a throwaway local HTTP server (some demos import real ES
modules) and captures each shot declared in `component.json` into
`docs/public/screenshots/<component>/`. Supports per-theme shots, CSS `filter`
(for the greyscale proof), element selectors, full page, and `clipHeight` crops.

### `tools/lib/`

`contrast-core.mjs` (OKLCH→sRGB, WCAG ratio, CSS var parsing) and
`components.mjs` (discovery + CLI selection). A new component writes **data**,
not code.

## 7. Gotchas

Things that already cost time. Do not rediscover them.

1. **Prettier fights the table generator.** Prettier re-pads markdown tables
   (`|---|` → `| ------- |`), so a byte comparison always reports drift. The
   generator normalises table rows before comparing. If you change the table
   format, keep that normaliser working or CI will flap forever.
2. **`clip-path` eats `border`.** The trapezoid tab cannot take a real border —
   the clip removes it on the diagonal. The outline is four zero-blur
   `drop-shadow()` filters, which _do_ trace the clipped silhouette.
3. **`aria-disabled` ≠ `:disabled`.** `disabled` removes the element from the
   page and from focus. `aria-disabled` keeps it focusable so a screen-reader
   user can find it and learn why it is unavailable — WAI-ARIA prefers this. Both
   must be styled and both must be skipped by arrow keys. It is easy to style one
   and forget the other.
4. **`:scope >` in every query.** Without it, a nested control's tabs are found by
   its parent's selector. This bit both the source _and_ a test.
5. **`scroll-behavior: smooth` races assertions.** Setting `scrollLeft` animates.
   Tests must either wait or use `scrollTo({ behavior: "instant" })`.
6. **Playwright browser version pinning.** `playwright` is pinned to `1.49.1`
   because the browser build must match the library. If you bump it, run
   `npx playwright install chromium`.
7. **A test that passes for the wrong reason is worse than a failing one.** A
   drift-detection check here once "passed" because the `sed` that was supposed to
   corrupt the file silently matched nothing. Verify your negative tests actually
   fail.
8. **VitePress `base` is `/ui/`.** Markdown image paths must **not** include it —
   write `/screenshots/folder-tabs/x.png`; VitePress prefixes it.
9. **GitHub Pages does not redirect after a repo rename.** The `v1.0.0` release
   notes were written against the old Pages URL and had to be re-pointed by hand.

## 8. Adding a component

The tooling is data-driven, so this is mostly writing a manifest.

1. **`mkdir components/<name>`** and add `component.json`. Copy
   `components/folder-tabs/component.json` and edit: `name`, `title`, `css`,
   `demo`, the `contrast` block (prefix, theme selectors, text pairs, boundary
   pairs, table targets) and `shots`.
2. **Write `<name>.css`.** Define your variables under `:root`, override under
   `.dark, [data-theme="dark"]`, and repeat under
   `@media (prefers-color-scheme: dark)` guarded with
   `:root:not(.light):not([data-theme="light"])`. Add an
   `@supports not (color: oklch(0 0 0))` sRGB fallback,
   `prefers-reduced-motion`, `forced-colors` and `print`.
3. **Run `npm run contrast <name>` early and often.** Design the palette against
   the measurement, not the other way round. Expect to need an edge variable for
   dark mode (§4).
4. **Write `demo.html`** with correct ARIA from the start, and the inline markers
   if it has a vanilla build. Run `npm run build:demo`.
5. **Write `test.mjs`.** Export a default `async ({ page, check })`. Test
   behaviour: keyboard, focus visibility, state, nesting, overflow.
6. **Add `<!-- CONTRAST:START -->` / `<!-- CONTRAST:END -->`** to the component
   README and its docs theming page, then `npm run contrast -- --sync`.
7. **`npm run screenshots <name>`**, then add docs pages under
   `docs/components/<name>/` and wire the sidebar in `docs/.vitepress/config.ts`.
8. **`npm run check`** must be green before you push.

Hold it to [the bar](README.md#the-bar). If it cannot meet it, say so in the
component README rather than quietly lowering it.

## 9. Infrastructure

- **CI** (`.github/workflows/ci.yml`): prettier check; docs build; then contrast
  - table check, demo-sync check, and the browser tests.
- **Pages** (`.github/workflows/deploy-docs.yml`): builds `docs/` and deploys.
  `configure-pages` uses `enablement: true` so a fresh fork works without a
  manual settings step.
- **`gh` is authenticated as `spcaeo`** with `repo` and `workflow` scopes. A
  second account (`kelleyjamesautomation`) has an invalid token — ignore it.
- **`.claude/` is gitignored** (session transcripts; do not commit).

## 10. Open items

- **The original VB screenshot is not in the repo.** A pasted image could not be
  written to disk. `heritage-vb-colourway.png` is a _recreation_ built from the
  real stylesheet with the VB colourway — honest and useful, but if you get the
  genuine screenshot, save it to
  `docs/public/screenshots/folder-tabs/vb-original.png` and reference it.
- **Nothing is published to npm.** `components/folder-tabs/package.json` is ready
  (`@spcaeo/folder-tabs`), root is `private: true`.
- **`CHANGELOG.md` is repo-level.** With more components it should probably move
  to per-component changelogs.
- **No visual regression testing.** Screenshots are generated but not diffed.

---

Built and maintained by **[Space-O Technologies](https://www.spaceo.ca)**.
