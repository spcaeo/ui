# Contributing

The full guide lives in
[`CONTRIBUTING.md`](https://github.com/spcaeo/ui/blob/main/CONTRIBUTING.md)
in the repository root. This page is the short version, plus the one rule that
catches people out.

These rules apply to **every component in the collection**, not just the one that
happens to be here today. The bar itself is written out in
[House Rules](/guide/house-rules); this page is how you meet it in a pull
request.

## There is no build step

A component is plain CSS plus, at most, one small file per framework build.
Nothing is compiled. Open its demo straight off disk:

```bash
open components/folder-tabs/demo.html
```

That is the whole development loop. Edit a file, refresh the browser. Each
component's demo page exercises its variants and both themes on one page, so it
is also the fastest way to check you have not broken something else. A demo that
needs a web server to work is a bug — report it.

The documentation site is the only part with dependencies:

```bash
cd docs
npm install
npm run docs:dev
```

## The one hard rule: re-measure the contrast

> The colour variables are **a measured set, not a palette you can taste-test.**
> If you change one fill, you must re-measure **all** the affected ratios, in
> **both** themes.

Every value was chosen so that:

- label text keeps at least **4.5:1** against the tab it sits on (WCAG 1.4.3),
  and
- every interface boundary clears at least **3.0:1** (WCAG 1.4.11) **by fill or
  by the `--tab-edge` stroke** — either route counts, which is the only reason
  dark mode can pass at all, because
  [no two genuinely dark fills can reach 3:1](/components/folder-tabs/theming#why-dark-fills-cannot-carry-a-boundary).

Do not measure by hand. There is a script, and it is the single source of truth:

```bash
npm run contrast              # measure and report
npm run contrast -- --sync    # measure, and rewrite the generated tables
npm run contrast -- --check   # verify without writing — this is what CI runs
```

It parses the component's stylesheet — for folder tabs,
`components/folder-tabs/folder-tabs.css` — checks every pair in both themes, and
regenerates the contrast tables in the component's `README.md` and in its theming
page (for folder tabs,
[Theming](/components/folder-tabs/theming#contrast)) between their
`CONTRAST:START` / `CONTRAST:END` markers. CI runs `--check`, so a stylesheet and
its docs cannot disagree.

Then, in the same pull request:

1. Run `npm run contrast -- --sync` and **commit the regenerated tables**. Do not
   hand-edit them, and do not put anything between the markers — it is
   overwritten.
2. Measure the `oklch()` declarations, not the sRGB hex in the
   `@supports` block. Those fallbacks are rounded and disagree in the second
   decimal, which is enough to flip a boundary sitting on 3.02.
3. Say in the PR description which values changed.

A pull request that changes a colour without new measurements will be asked for
them before review. This is the only strict rule in the project, and the reason
it is strict is that the margins are genuinely thin — light theme's tab-against-
rail boundary sits at 3.02 against a requirement of 3.0. There is no room for an
unmeasured nudge.

## The other things not to break

- **Keep it dependency-free.** A vanilla build has zero dependencies; a
  framework build may take at most one, and the component's README must name it.
  Folder tabs' React build takes `@radix-ui/react-tabs` and nothing else. No icon
  library, no Tailwind, no `cn` helper. Two chevrons are inline SVG for a reason.
- **Keep the ARIA pattern intact.** Whichever WAI-ARIA pattern a component
  implements, implement all of it: roles, state attributes, roving `tabindex`
  where the pattern calls for it, the arrow keys, `Home`/`End`, disabled-item
  skipping, focusable regions. Folder tabs' version is written out in
  [Accessibility](/components/folder-tabs/accessibility).
- **Keep the mechanic.** Every component has one idea doing the work, and it is
  not decoration. For folder tabs, the active tab's fill must remain identical to
  the panel's, in every theme, with no line along the join — there is a
  [six-point checklist](/components/folder-tabs/the-mechanic#a-checklist-for-not-breaking-it) if
  you are changing anything visual.
- **Regenerate the sRGB fallbacks.** The `@supports not (color: oklch(0 0 0))`
  block holds a second copy of every variable. It is generated — do not
  hand-edit it, and do not leave it holding the old palette.

## Formatting and commits

Prettier handles formatting, and CI checks it:

```bash
npx prettier --check .
npx prettier --write .
```

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/):
`feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`.

## Before you open the PR

1. `npx prettier --check .`
2. `npm run contrast -- --check` if you touched a colour.
3. Test in **light and dark** theme.
4. Test with the **keyboard** — arrows, Home, End, Tab.
5. Test at a **narrow width**, so the overflow arrows appear and disable.
6. Fill in the checklist in the PR template.

Small pull requests get reviewed faster. If you are planning something large,
open an issue first so the shape can be agreed before you build it.

By taking part you agree to the
[Code of Conduct](https://github.com/spcaeo/ui/blob/main/CODE_OF_CONDUCT.md).
