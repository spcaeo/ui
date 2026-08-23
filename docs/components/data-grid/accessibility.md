# Accessibility

What follows is what the shipped builds actually do, including the parts that
are incomplete. A component that overstates its accessibility is worse than one
that says nothing, because someone will ship it on the strength of the claim.

## Semantic markup

The grid is a real `<table>` with a real `<thead>` and `<tbody>`. Header cells
carry `scope="col"`. There is no `role="grid"`, no `role="row"` added by hand,
and no div soup with ARIA glued on afterwards.

That matters because a browser's table semantics are better than anything you
can reconstruct. A screen reader user gets row and column navigation, the header
announced with each cell, and a table count on entry — for free, and correctly,
in every assistive technology, because it is the oldest and best-supported
structure on the web.

If you take the CSS-only path, keep the table. `.dg-table` styles `<table>`; it
is not a set of grid classes for divs.

## Sortable headers

A sortable column header is a real `<button>` inside the `<th>`:

```html
<th scope="col" aria-sort="descending">
  <button type="button" class="dg-sort">Price<svg class="dg-sort-arrow" … /></button>
</th>
```

Two things there are load-bearing.

**`aria-sort` lives on the `<th>`**, which is where the specification puts it,
and it is `"ascending"`, `"descending"`, or `"none"`. `"none"` is set on every
sortable column that is not currently sorted — that is what tells a user the
column _can_ be sorted. A non-sortable column gets no `aria-sort` at all, which
correctly says the question does not apply.

**The control is a button, not a clickable `<th>`.** It is in the tab order, it
responds to Enter and Space without any key handling of ours, and it is
announced as a button. A `<th>` with an `onClick` is reachable by mouse and by
nothing else.

The chevron is `aria-hidden`; the direction is carried by `aria-sort`, not by an
icon a screen reader would have to describe.

## Selection

Every checkbox has a label, and the labels are distinct:

```html
<input type="checkbox" aria-label="Select all rows on this page" />
<input type="checkbox" aria-label="Select Wuthering Heights" />
```

A row's label is built from its first column's value, falling back to the row
id. A column of fourteen checkboxes all announced as "checkbox" is not usable;
the label has to say _which_ row.

::: tip Put something identifying in your first column
The row label is `row[columns[0].id]`. If your first column is a status badge,
every checkbox announces the same word. Order the columns so the first one names
the thing.
:::

### The selection bar names its scope

> **14** selected on this page

Not "14 selected". The bar carries `role="status"`, so it is announced when it
appears and when the count changes.

"Selected" that silently means _this page_ is how a bulk action surprises
someone: a user selects the header checkbox, believes they have 2,000 rows,
presses Delete, and gets 25. Saying the scope out loud in four extra words costs
nothing and closes the gap. The header checkbox is labelled "Select all rows on
**this page**" for the same reason.

Selection is dropped automatically when the predicate changes — a new search,
filter or segment. See
[URL State](/components/data-grid/url-state#the-six-rules).

::: warning `aria-selected` on rows is a styling hook, not a promise
Selected rows carry `aria-selected="true"`, and the stylesheet uses it. On a
plain `<table>` — which this is — `aria-selected` on a row is not part of the
supported ARIA table pattern and should not be relied on to be announced. The
checkbox is the authoritative, announced state. If you need the attribute
announced, you are building a `role="grid"` widget, which is a different
component with a different keyboard contract.
:::

## Announcing results

The **vanilla** build renders a visually hidden live region inside the host:

```html
<div class="dg-sr-only" role="status" aria-live="polite">248 results</div>
```

It is updated after every successful load, so a screen reader user who changes a
filter is told how many rows matched. Without it the only feedback for a filter
change is a visual one, and the grid appears to do nothing.

::: warning The React build does not ship this live region
`<DataGrid>` has `role="status"` on the selection bar and on the dropped-filter
warning chip, but it does **not** render an `aria-live` region announcing the
result count. If you are using the React build and this matters to you — and on
a listing screen it should — render one yourself alongside the grid:

```tsx
<p className="dg-sr-only" role="status" aria-live="polite">
  {status === "ready" ? `${total ?? rows.length} results` : ""}
</p>
```

`.dg-sr-only` is not defined in the stylesheet; the vanilla build applies the
clip styles inline. Use your own visually-hidden utility, or copy the inline
style from `vanilla/data-grid.js`.
:::

## Loading

The skeleton container carries `aria-busy="true"`. Assistive technology is told
the region is populating rather than reading out a table of empty cells.

## Keyboard

Everything interactive is a native control, so the keyboard contract is the
browser's rather than ours.

| Key                                 | Where                | What happens                                 |
| ----------------------------------- | -------------------- | -------------------------------------------- |
| <kbd>Tab</kbd>                      | Everywhere           | Moves through toolbar, headers, rows, footer |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | Any button           | Activates it                                 |
| <kbd>Escape</kbd>                   | Search field         | Clears the search and re-runs the query      |
| <kbd>Escape</kbd>                   | Open filter menu     | Closes it (native popover light-dismiss)     |
| <kbd>Space</kbd>                    | A checkbox           | Toggles it                                   |
| Arrow keys                          | Rows-per-page select | Native select behaviour                      |

Filter menus use the native `popover` attribute, so dismissal on
<kbd>Escape</kbd> and on outside click come from the browser, not from a
document-level key listener that has to be remembered and removed.

There are **no custom keyboard shortcuts** and no key handling on the table
itself. Arrow keys do not move a cell cursor, because this is a listing table
rather than a spreadsheet, and a table that traps arrow keys breaks the screen
reader's own navigation.

## Focus

```css
.dg :focus-visible {
  outline: 2px solid var(--dg-ring);
  outline-offset: 2px;
}
```

Applied to every focusable descendant of the host. Nothing sets `outline: none`
anywhere in the stylesheet. `--dg-ring` is measured against both the background
and the header fill at 3:1, so the outline is visible on a focused column header
as well as on a button in the toolbar — a ring measured only against the page
background is the usual way this is got wrong.

The offset keeps the ring off the control's own border, which is what makes it
readable on the dense header row.

## The segment strip

The segment buttons carry `role="tab"` inside a `role="tablist"`, with
`aria-selected` on the active one.

::: warning This is a partial tab pattern
The segments are `<button>` elements with `role="tab"` and `aria-selected`, and
that is where it stops. There is **no roving `tabindex`**, **no arrow-key
navigation**, and **no `aria-controls`** pointing at a tabpanel — because there
is no tabpanel; a segment reloads the same table rather than swapping panels.

The practical effect is that each segment is its own tab stop, and a screen
reader announcing "tab, 2 of 4" will set an expectation of arrow-key navigation
that is not met.

If you need this to be right for an audit today, the safe change is to drop
`role="tablist"` and `role="tab"` from the segment markup and use
`aria-pressed` on plain buttons instead. The stylesheet keys off
`[aria-selected="true"]`, so you would also add a rule for
`[aria-pressed="true"]` — `.dg-btn[aria-pressed="true"]` already exists as a
precedent.
:::

## Filter menus

The trigger is a `<button>` with `popovertarget` pointing at a `popover="auto"`
element. The menu contains real `<label>`-wrapped checkboxes, so each option is
clickable at its text and announced with its name.

Because the native popover has no cross-browser anchor positioning yet, both
builds position the menu themselves on `beforetoggle` rather than taking a
positioning dependency for one menu.

::: warning `aria-expanded` is set by the vanilla build only
The vanilla filter trigger updates `aria-expanded` on every `beforetoggle`. The
React trigger does not set it at all, so a screen reader is not told whether the
menu is open. If you are using the React build, that is a small patch worth
making locally.
:::

## Chips

Each active filter is a chip whose remove button is labelled:

```html
<button aria-label="Remove filter genre">…</button>
```

The label uses the field's **id**, not its display label, so a field whose id is
`acct_mgr_2` announces that rather than "Account manager". Worth patching if
your ids are not readable — the chip's visible text already uses the friendly
label via `describeCondition`.

The dropped-filter warning carries `role="status"`, so a link that has lost
filters announces the fact rather than only drawing it. That is the whole
purpose of the chip; see
[Filtering](/components/data-grid/filtering#dropped-fields).

## Environment

**Reduced motion.** Under `prefers-reduced-motion: reduce` the skeleton pulse,
the refresh sweep and the sort-arrow transition are switched off. Those are the
only animations in the component.

**Forced colours.** Under `forced-colors: active` the stylesheet re-states every
boundary with system keywords — `ButtonBorder` for the frame, popover, chips,
banner and selection bar, `Canvas` behind the header row, `Highlight` and
`HighlightText` for hovered and selected rows, `CanvasText` for the focus ring.
A selected row distinguished only by a custom `--accent` vanishes in that mode;
this one does not.

**Print.** The toolbar, pagination, selection bar and any open popover are
hidden, the frame gets a solid black border, the scroll container is released so
wide tables are not clipped at the paper edge, and cell text wraps instead of
truncating.

## Colour is never the only signal

Sort state is carried by `aria-sort` and by a rotated chevron, not by a tint.
Selection is carried by a checkbox, not by a row colour. The error state is
carried by its wording, its icon, and a code — the red is the last of four
signals, not the first. Desaturate the whole grid and everything it is telling
you survives.

## What is not covered

Stated plainly, so nobody discovers it during an audit:

- The segment strip's tab pattern is incomplete (above).
- The React build has no result-count live region (above).
- The React filter trigger does not set `aria-expanded` (above).
- Chip remove buttons announce field ids rather than labels (above).
- There is no keyboard shortcut to focus the search box.
- Column resizing, reordering and a cell cursor do not exist, so the keyboard
  patterns for them are not implemented either.
- No screen reader testing results are published for this component. The claims
  on this page describe the markup and the CSS, both of which you can read in
  `components/data-grid/`; they are not a substitute for testing with the
  assistive technology your users actually use.

## Related

- [States](/components/data-grid/states) — the wording each state uses, and why
  it differs
- [Theming](/components/data-grid/theming#measured-contrast) — the measured
  contrast table and what it does and does not cover
- [House Rules](/guide/house-rules) — the bar every component here has to meet
