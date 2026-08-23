# CSS API

Everything in `components/folder-tabs/folder-tabs.css`: eight custom properties, ten classes, two state
attributes. This is the complete surface — there is nothing else to learn.

## Custom properties

All eight are defined on `:root` and overridden for dark mode. They are the only
colours in the stylesheet.

| Property              | Light                  | Dark                   | Paints                                             |
| --------------------- | ---------------------- | ---------------------- | -------------------------------------------------- |
| `--tab-rail`          | `oklch(0.20 0.02 260)` | `oklch(0.17 0.02 260)` | The rail behind the tabs                           |
| `--tab-rail-fill`     | `oklch(0.50 0.03 260)` | `oklch(0.26 0.02 260)` | An inactive tab; the arrow buttons                 |
| `--tab-rail-ink`      | `oklch(0.96 0 0)`      | `oklch(0.93 0 0)`      | An inactive tab's label; the arrow chevrons        |
| `--tab-panel`         | `oklch(1 0 0)`         | `oklch(0.40 0 0)`      | The panel **and** the active tab                   |
| `--tab-panel-ink`     | `oklch(0.145 0 0)`     | `oklch(0.985 0 0)`     | Panel text; the active tab's label                 |
| `--tab-edge`          | `oklch(0.20 0.02 260)` | `oklch(0.70 0 0)`      | The stroke around every tab; the panel border      |
| `--tab-ring`          | `oklch(0.98 0 0)`      | `oklch(0.95 0 0)`      | Focus outline on an inactive tab and on the arrows |
| `--tab-ring-on-panel` | `oklch(0.30 0 0)`      | `oklch(0.95 0 0)`      | Focus outline on the active tab and on the panel   |

### Required relationships

These are constraints, not preferences. See
[The Mechanic](/components/folder-tabs/the-mechanic) and [Theming](/components/folder-tabs/theming).

| Rule                                                                 | Why                                                                                                         |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `--tab-panel` is the **lightest** of the three fills, in every theme | It _is_ the panel; if it is darker than the tab fill, selection reads as inverted                           |
| `--tab-rail` is the **darkest** of the three fills                   | It is the ground everything stands on                                                                       |
| `--tab-rail-ink` ≥ 4.5:1 on `--tab-rail-fill`                        | WCAG 1.4.3, normal text                                                                                     |
| `--tab-panel-ink` ≥ 4.5:1 on `--tab-panel`                           | WCAG 1.4.3, normal text                                                                                     |
| Every boundary clears 3:1 **by fill or by `--tab-edge`**             | WCAG 1.4.11, component boundary. Light theme passes by fill, dark theme by edge — either route satisfies it |
| `--tab-ring` ≥ 3:1 on `--tab-rail-fill`                              | WCAG 1.4.11, focus indicator                                                                                |
| `--tab-ring-on-panel` ≥ 3:1 on `--tab-panel`                         | WCAG 1.4.11, focus indicator                                                                                |

## Theme selectors

Dark values are applied by all three of the common strategies, so the control
follows whichever one your app already uses:

| Selector                                                                                      | When it applies                                                  |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `.dark`                                                                                       | A class toggled on a wrapper or `html`                           |
| `[data-theme="dark"]`                                                                         | A data attribute toggled on a wrapper or `html`                  |
| `@media (prefers-color-scheme: dark)` scoped to `:root:not(.light):not([data-theme="light"])` | The OS preference, unless an explicit light choice has been made |

The `:not()` guards make an explicit choice beat an inferred one: a user who
picked light mode in your UI gets light mode even on a dark-mode OS.

## Fallbacks and environment blocks

| Block                                     | What it does                                                                                                                                                         |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@supports not (color: oklch(0 0 0))`     | Redefines all eight variables as sRGB hex, light and dark. **Generated** — do not hand-edit                                                                          |
| `@media (prefers-reduced-motion: reduce)` | Removes the tab transition and the smooth scroll                                                                                                                     |
| `@media (forced-colors: active)`          | Swaps to system colours: `ButtonFace`/`ButtonText`, `Highlight` on the active tab, `GrayText` for disabled, a real `ButtonBorder` in place of the drop-shadow stroke |
| `@media print`                            | Hides the arrows, sets the strip to `overflow: visible`, keeps hidden panels hidden                                                                                  |

## Classes

### Structure

| Class          | On                                       | What it does                                                                                                      |
| -------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `.fldr-rail`   | The `role="tablist"` element             | The dark band. Flex row, `align-items: flex-end`, `padding: 4px 4px 0`, `border-radius: 8px 8px 0 0`              |
| `.fldr-scroll` | A `div` inside the rail                  | The scrolling strip. `flex: 1 1 auto`, `min-width: 0`, `overflow-x: auto`, `gap: 3px`, hidden scrollbar           |
| `.fldr-tab`    | Each `button[role="tab"]`                | A trapezoid tab. `clip-path` polygon, edge stroke via `drop-shadow`, `flex: 0 0 auto`, `white-space: nowrap`      |
| `.fldr-count`  | A `span` inside a tab label              | A quiet pill for a number. `color-mix(in oklch, currentColor 18%, transparent)`, tabular numerals                 |
| `.fldr-arrows` | A `div` inside the rail, after the strip | The arrow group. `display: none` until `data-overflowing="true"`                                                  |
| `.fldr-arrow`  | Each arrow `button`                      | A 20×20 square button with a `1px solid var(--tab-edge)` border                                                   |
| `.fldr-panel`  | Each `role="tabpanel"` element           | The sheet. `--tab-panel` ground, `1px solid var(--tab-edge)` on three sides, **`border-top: 0`**, `padding: 16px` |

### Modifiers

| Class               | Applied with                                    | Effect                                                                                                                             |
| ------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `.fldr-panel-flush` | `.fldr-panel`                                   | Tightens padding to `14px 14px 4px`. **Keeps** the ground and the side walls — for content that brings its own card                |
| `.fldr-nested`      | The control's outermost element                 | Renders the whole control one size down: rail padding `3px 3px 0`, radius `6px`, tab font `12px`, panel padding `14px`. Same fills |
| `.fldr-nested-rail` | `.fldr-rail`, without a `.fldr-nested` ancestor | The nested **size** only, applied to a standalone strip. Does not touch any panel                                                  |

`.fldr-nested` styles descend through `> .fldr-rail` and `> .fldr-panel`, so a
nested control never restyles a control nested inside _it_ twice over.

## State attributes

The stylesheet reads exactly two attributes. Whatever sets them — the React
build, the vanilla build, or your own code — this is the entire contract.

| Attribute          | On             | Values                     | Effect                                                                                                                                                                 |
| ------------------ | -------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-state`       | `.fldr-tab`    | `"active"` \| `"inactive"` | `"active"` gives the tab `--tab-panel` as its background, `--tab-panel-ink` as its colour, `font-weight: 600`, and 3px more top padding so it stands proud of the rail |
| `data-overflowing` | `.fldr-arrows` | `"true"` \| `"false"`      | `"true"` switches the arrow group from `display: none` to `display: flex`                                                                                              |

Two more states are styled without being part of that contract:

| Selector                                                | Effect                                                                          |
| ------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `.fldr-tab:disabled`, `.fldr-tab[aria-disabled="true"]` | `opacity: 0.45`, `cursor: not-allowed` — **both spellings, styled identically** |
| `.fldr-tab:focus-visible`                               | `2px solid var(--tab-ring)`, `outline-offset: -3px`                             |
| `.fldr-tab[data-state="active"]:focus-visible`          | Same, but `outline-color: var(--tab-ring-on-panel)`                             |
| `.fldr-panel:focus-visible`                             | `2px solid var(--tab-ring-on-panel)`, `outline-offset: -2px`                    |

The two disabled spellings look the same on purpose but behave differently:
`disabled` removes the tab from the page, while `aria-disabled="true"` keeps it
focusable so a screen reader user can find it and be told why it is unavailable.
WAI-ARIA prefers the second. See
[two kinds of disabled](/components/folder-tabs/accessibility#two-kinds-of-disabled).

::: warning
`data-state` drives the CSS. `aria-selected` drives assistive technology. They
are two different audiences reading the same fact, and if you are setting state
yourself you must set both. See [Accessibility](/components/folder-tabs/accessibility).
:::

## Selectors you may want to override

| Selector                                                                                | Currently                           | Note                                                                  |
| --------------------------------------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------- |
| `.fldr-tab`                                                                             | `font-size: 13px; font-weight: 500` | `font: inherit` first, so it picks up your family                     |
| `.fldr-tab[data-state="active"]`                                                        | `font-weight: 600`                  | The weight change is a bonus signal, not the mechanic                 |
| `.fldr-tab:hover:not(:disabled):not([aria-disabled="true"]):not([data-state="active"])` | `color-mix(...)` 12% toward the ink | The active tab has no hover state on purpose — it is already selected |
| `.fldr-tab:disabled`, `.fldr-tab[aria-disabled="true"]`                                 | `opacity: 0.45`                     | Do not raise this. The low contrast _is_ the disabled signal          |
| `.fldr-panel`                                                                           | `padding: 16px`                     | Prefer `.fldr-panel-flush` over overriding this                       |
| `.fldr-arrow > svg`                                                                     | `width: 14px; height: 14px`         | Sized here so any 24×24 viewBox icon fits                             |

## Two implementation details

**The tab has no `border`.** `clip-path` cuts a border off along the diagonal
edge, so the stroke is three zero-blur `drop-shadow()` filters instead — left,
right, and top:

```css
filter: drop-shadow(1px 0 0 var(--tab-edge)) drop-shadow(-1px 0 0 var(--tab-edge))
  drop-shadow(0 -1px 0 var(--tab-edge));
```

There is deliberately no bottom shadow. That absence is the join.

**The trapezoid is a real polygon.**

```css
clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 100%, 0 100%);
```

Ten pixels of slope on the right-hand edge, cut the way a card index is cut. Not
a rounded rectangle standing in for one.
