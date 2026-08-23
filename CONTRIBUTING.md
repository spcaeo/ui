# Contributing

Thanks for taking an interest in this project. It is a small, focused UI control,
so contributing is deliberately simple.

## There is no build step

The control itself is plain CSS, one React file, and one vanilla JS file. Nothing
is compiled. To try your changes:

```bash
open components/folder-tabs/demo.html
```

That is the whole loop. Edit a file, refresh the browser.

## Running the docs site

The documentation site is the only part with dependencies:

```bash
cd docs
npm install
npm run dev
```

Then open the URL it prints. `npm run build` produces the static site.

## The one hard rule: the colour variables

`components/folder-tabs/folder-tabs.css` defines eight colour variables per theme. **They are a measured set,
not a palette you can taste-test.** Every tab fill was picked so that:

- label text keeps a contrast ratio of at least **4.5:1** against the tab it sits on
  (WCAG AA for normal text), and
- the boundary between a tab and the rail behind it keeps at least **3.0:1**
  (WCAG AA for non-text/UI boundaries).

If you change even one fill, you must:

1. Re-measure **all** the affected ratios, in light **and** dark theme. Any WCAG
   contrast checker works.
2. Update the contrast table in `README.md` with the new numbers.
3. Say in your PR which values you measured and what tool you used.

A pull request that changes a colour without new measurements will be asked for
them before review. This is the only strict rule here.

## Code style

Formatting is handled by Prettier, and CI checks it:

```bash
npx prettier --check .
npx prettier --write .   # to fix
```

Beyond that: keep it dependency-free, keep the vanilla build free of any framework,
and keep the ARIA tab pattern intact (roles, `aria-selected`, roving tabindex,
arrow/Home/End keys).

## Opening a pull request

1. Fork the repo and branch off `main`.
2. Make your change and run `npx prettier --check .`.
3. Test in **light and dark** theme, with the **keyboard** (arrows, Home, End, Tab),
   and at a **narrow width** so the overflow arrows appear.
4. Open the PR and fill in the checklist in the template.

Small PRs get reviewed faster. If you are planning something large, open an issue
first so we can agree on the shape of it.

## Commit messages

Please use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add vertical tab orientation
fix: keep focus on the active tab after overflow scroll
docs: explain the contrast table
chore: bump vitepress
```

Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.

## Code of conduct

By taking part you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## Adding a component

The tooling is data-driven — adding a component is mostly writing a manifest, not
writing scripts. The full recipe, with the reasoning behind each step, is in
**[HANDOVER.md § Adding a component](HANDOVER.md#adding-a-component)**.

In short:

1. `mkdir components/<name>` and write `component.json` (copy folder-tabs' and
   edit it). This is what every shared tool reads.
2. Write the stylesheet, and run `npm run contrast <name>` **while** you design
   the palette rather than after. If it has a dark theme, expect to need an edge
   variable — [here is why](HANDOVER.md#the-wcag-dark-mode-ceiling).
3. Write `demo.html` with correct ARIA from the start. It must work from
   `file://`.
4. Write `test.mjs` — behavioural tests, run by `npm test <name>`.
5. Add the `CONTRAST:START` / `CONTRAST:END` markers to the component README and
   its docs theming page, then `npm run contrast -- --sync`.
6. `npm run screenshots <name>`, add docs pages, wire the sidebar.
7. `npm run check` green before you push.

Every component is held to [the bar](README.md#the-bar). If yours cannot meet
part of it, say so explicitly in its README rather than quietly lowering it.
