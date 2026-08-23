# Contributing

The full guide lives in
[`CONTRIBUTING.md`](https://github.com/spcaeo/vb-inspired-folder-tabs/blob/main/CONTRIBUTING.md)
in the repository root. This page is the short version, plus the one rule that
catches people out.

## There is no build step

The control is plain CSS, one React file, and one vanilla JS file. Nothing is
compiled.

```bash
open demo.html
```

That is the whole development loop. Edit a file, refresh the browser. The demo
exercises nesting, overflow, disabled tabs, and dark mode on one page, so it is
also the fastest way to check you have not broken something else.

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
- every interface boundary keeps at least **3.0:1** (WCAG 1.4.11) — carried by
  the fill difference in light theme and by the `--tab-edge` stroke in dark,
  because [no two genuinely dark fills can reach 3:1](/guide/theming#why-dark-fills-cannot-carry-a-boundary).

There is a script for this:

```bash
npm run contrast
```

It recomputes every pair from the values in `folder-tabs.css` and tells you what
you broke.

Then, in the same pull request:

1. Update the contrast table in `README.md` with the new numbers.
2. Update the table in [Theming](/guide/theming#contrast) on this site.
3. Say in the PR description which values you measured and what tool you used.

A pull request that changes a colour without new measurements will be asked for
them before review. This is the only strict rule in the project, and the reason
it is strict is that the margins are genuinely thin — light theme's tab-against-
rail boundary sits at 3.02 against a requirement of 3.0. There is no room for an
unmeasured nudge.

## The other things not to break

- **Keep it dependency-free.** The vanilla build has zero dependencies and the
  React build has exactly one (`@radix-ui/react-tabs`). No icon library, no
  Tailwind, no `cn` helper. Two chevrons are inline SVG for a reason.
- **Keep the ARIA tab pattern intact.** Roles, `aria-selected`, roving
  `tabindex`, arrow keys, Home/End, disabled-tab skipping, focusable panels. See
  [Accessibility](/guide/accessibility).
- **Keep the mechanic.** The active tab's fill must remain identical to the
  panel's, in every theme, with no line along the join. There is a
  [six-point checklist](/guide/the-mechanic#a-checklist-for-not-breaking-it) if
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
2. `npm run contrast` if you touched a colour.
3. Test in **light and dark** theme.
4. Test with the **keyboard** — arrows, Home, End, Tab.
5. Test at a **narrow width**, so the overflow arrows appear and disable.
6. Fill in the checklist in the PR template.

Small pull requests get reviewed faster. If you are planning something large,
open an issue first so the shape can be agreed before you build it.

By taking part you agree to the
[Code of Conduct](https://github.com/spcaeo/vb-inspired-folder-tabs/blob/main/CODE_OF_CONDUCT.md).
