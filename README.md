# Folder Tabs

A tab control where **the active tab is the panel**, not a highlighted button.

Extracted from AngelLink. Standalone — no build step, no Tailwind, no design
system. React and vanilla versions, one stylesheet between them.

Open `demo.html` in a browser to see it.

---

## The mechanic

This is the whole idea, and everything else is detail:

> **Three fills in a fixed relationship.** The rail is darkest. An inactive tab
> sits above it. The active tab is *exactly the panel's fill*.

That identity is what makes tab and panel read as one sheet of paper. The active
tab is not marked — it *is* the panel, continuing upward.

Two things follow, and both matter:

- **It survives greyscale.** Shape and shared fill carry the state, so it still
  reads on a black-and-white print, for a colourblind user, or on a bad monitor.
  A tint alone does none of that.
- **The panel must exist.** Give the panel a different ground, or remove it, and
  the join disappears. The first version of this control had the active tab
  white on a white page and no panel border — it read as a floating outline, and
  it took a screenshot to notice.

## Getting it wrong in dark mode

The easiest mistake, and I made it:

> The active tab must stay the **lightest** of the three, because it is the
> panel. If your dark-mode panel token is darker than your tab fill, the
> selected tab reads as *pressed in* and the unselected ones read as raised.
> Exactly backwards.

Dark mode has less usable range below "a panel you can read", which is why
`--tab-panel` is its own variable here rather than borrowing a card colour.

## Contrast

Measured on rendered pixels, not eyeballed. WCAG asks 4.5 for a label and 3.0
for a boundary.

| | label on tab | tab against rail |
|---|---|---|
| Light | 5.35 | 3.03 |
| Dark | 4.53 | 3.23 |

These six numbers are a **set**. Lift the tab fill for a clearer edge and the
label drops under 4.5; darken it for the label and the edge disappears. Change
one, re-measure all of them.

## Files

```
folder-tabs.css        the control. Start here — it is the real asset.
react/folder-tabs.tsx  React, on Radix Tabs (keyboard + ARIA come free)
vanilla/folder-tabs.js no framework, no dependencies
demo.html              working example: nesting, overflow, disabled, dark
```

## React

Needs `@radix-ui/react-tabs` and a `cn` helper (clsx + tailwind-merge, or just
`filter(Boolean).join(" ")`).

```tsx
<FolderTabs value={tab} onValueChange={setTab}>
  <FolderTabsRail aria-label="Sections">
    <FolderTab value="rules">Rules</FolderTab>
    <FolderTab value="dates">Dates</FolderTab>
    <FolderTab value="preview" disabled>Preview</FolderTab>
  </FolderTabsRail>

  <FolderTabsPanel value="rules">…</FolderTabsPanel>
  <FolderTabsPanel value="dates" flush>…a grid, which brings its own padding…</FolderTabsPanel>
</FolderTabs>
```

`nested` on `FolderTabs` renders it one size down, for a tab control inside a
tab panel. Same fills on purpose: it is the same kind of thing one level down,
and a second colourway would claim otherwise.

`flush` on a panel drops the padding but **keeps the walls** — for content that
brings its own card. Dropping the walls too leaves the rail floating above
nothing, which is the mechanic gone.

## Vanilla

```html
<link rel="stylesheet" href="folder-tabs.css">
<script type="module">
  import { initFolderTabs } from "./vanilla/folder-tabs.js";
  initFolderTabs();
</script>
```

Markup is documented at the top of `vanilla/folder-tabs.js`.

## Details worth keeping

- **Tabs do not overlap.** An earlier version pulled each 6px under its
  neighbour to tuck like a card index. With every inactive tab on one fill that
  is a single block with notches in it. The rail showing through a 3px gap is
  what separates them.
- **Arrows live inside the rail** and **disable** at each end rather than
  disappearing. A control that changes width under the cursor misfires.
- **Focus scrolls into view.** With overflow, arrow-keying to a tab off the
  right edge would otherwise move focus somewhere invisible — the failure that
  makes a scrolling tab strip unusable by keyboard.
- **Arrows are `tabindex="-1"`.** They are scroll controls, not tabs, and should
  not be stops in the tab sequence.

## Licence

MIT. Take it.
