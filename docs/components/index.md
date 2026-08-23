# Components

Every component here has passed the same checks: measured contrast in both
themes, state that survives greyscale, the full keyboard and ARIA pattern it
claims, reduced-motion and forced-colors handling, and a demo that opens straight
off disk. The bar is written out in [House Rules](/guide/house-rules).

There are two components today. That is not a roadmap position — a component
gets added when it can pass, and not before.

## Folder Tabs

A tab control where the active tab **is** the panel, not a highlighted button.
Rebuilt from the Visual Basic 4 SSTab control: the rail is darkest, an inactive
tab sits above it, and the active tab is cut as a trapezoid carrying the panel's
exact fill, so the tab and the panel read as one sheet of paper.

<div class="shot">

[![The control in light theme: a white active tab merged into a white panel, grey inactive tabs on a near-black rail](/screenshots/folder-tabs/tabs-light.png)](/components/folder-tabs/)

</div>

Ships as plain CSS, a React build on Radix Tabs, and a zero-dependency vanilla ES
module — one stylesheet between all three.

- [Guide](/components/folder-tabs/) — what it is and why it is built this way
- [Installation](/components/folder-tabs/installation) — three copy-in paths
- [Quick Start](/components/folder-tabs/quick-start) — shortest working example
- API reference: [CSS](/components/folder-tabs/api-css) ·
  [React](/components/folder-tabs/api-react) ·
  [Vanilla JS](/components/folder-tabs/api-vanilla)

## Data Grid

A listing grid whose **entire state lives in the URL**. Search, filter, sort,
page, segment and display mode are all in the address bar, so any view can be
shared, bookmarked, reloaded, and reached by Back. There are many good React
tables; almost none of them can be linked to.

<div class="shot">

[![The grid in light theme, showing a bookshop stock list with a search box, a genre filter, sortable headers and pagination](/screenshots/data-grid/grid-light.png)](/components/data-grid/)

</div>

Zero dependencies — popovers use the native `popover` attribute and dialogs use
`<dialog>`. It also declines to duplicate your design system: every colour is
`var(--host-token, fallback)`, so it inherits shadcn/ui's tokens where they
exist and falls back to a measured palette where they do not.

- [Guide](/components/data-grid/) — what it is and why it is built this way
- [Installation](/components/data-grid/installation) — four copy-in paths
- [URL State](/components/data-grid/url-state) — the parameter table and the six
  rules the core enforces
- [Filtering](/components/data-grid/filtering) ·
  [States](/components/data-grid/states) ·
  [Theming](/components/data-grid/theming) ·
  [Accessibility](/components/data-grid/accessibility)
- API reference: [Core](/components/data-grid/api-core) ·
  [React](/components/data-grid/api-react) ·
  [Vanilla JS](/components/data-grid/api-vanilla)

## Adding another

The rules a new component has to meet are in
[House Rules](/guide/house-rules), and the pull request process is in
[Contributing](/guide/contributing). Both are written to be checkable, so you can
tell before you open the PR whether it will pass.
