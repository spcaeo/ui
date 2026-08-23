# Quick Start

The shortest thing that works, for each of the three paths. Copy one, get it on
screen, then read [The Mechanic](/guide/the-mechanic) to understand what you are
looking at.

## Vanilla

One HTML file. Save it next to `folder-tabs.css` and `folder-tabs.js` and open it
in a browser — no server needed, as long as you are opening it over `http://` or
your browser allows module imports from `file://`.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Folder Tabs</title>
    <link rel="stylesheet" href="./folder-tabs.css" />
  </head>
  <body>
    <div data-folder-tabs>
      <div class="fldr-rail" role="tablist" aria-label="Sections">
        <div class="fldr-scroll">
          <button
            class="fldr-tab"
            role="tab"
            id="tab-rules"
            aria-controls="panel-rules"
            aria-selected="true"
            data-state="active"
          >
            Rules
          </button>
          <button
            class="fldr-tab"
            role="tab"
            id="tab-dates"
            aria-controls="panel-dates"
            aria-selected="false"
            data-state="inactive"
          >
            Dates
          </button>
        </div>

        <div class="fldr-arrows">
          <button class="fldr-arrow" data-dir="-1" tabindex="-1" aria-label="Scroll tabs left">
            ‹
          </button>
          <button class="fldr-arrow" data-dir="1" tabindex="-1" aria-label="Scroll tabs right">
            ›
          </button>
        </div>
      </div>

      <div
        class="fldr-panel"
        role="tabpanel"
        id="panel-rules"
        aria-labelledby="tab-rules"
        tabindex="0"
      >
        The rules panel.
      </div>
      <div
        class="fldr-panel"
        role="tabpanel"
        id="panel-dates"
        aria-labelledby="tab-dates"
        tabindex="0"
        hidden
      >
        The dates panel.
      </div>
    </div>

    <script type="module">
      import { initFolderTabs } from "./vanilla/folder-tabs.js";
      initFolderTabs();
    </script>
  </body>
</html>
```

Three things in that markup are load-bearing and easy to get wrong:

- **`data-state="active"` on exactly one tab**, with `hidden` on every panel
  except that one. This is the initial state; the script reads it rather than
  deciding for you.
- **`aria-controls` on the tab must match the panel's `id`.** That pairing is how
  the script finds the panel to show, and how a screen reader knows they belong
  together.
- **`tabindex="-1"` on the arrows.** They are scroll controls, not tabs. Leaving
  them in the tab sequence puts two dead stops between your tab strip and your
  panel content.

Full contract: [Vanilla API](/api/vanilla).

## React

```tsx
import { useState } from "react";
import {
  FolderTabs,
  FolderTabsRail,
  FolderTab,
  FolderTabsPanel,
  FolderTabCount,
} from "./components/folder-tabs";

export function Settings() {
  const [tab, setTab] = useState("rules");

  return (
    <FolderTabs value={tab} onValueChange={setTab}>
      <FolderTabsRail aria-label="Sections">
        <FolderTab value="rules">
          Rules <FolderTabCount>3</FolderTabCount>
        </FolderTab>
        <FolderTab value="dates">Dates</FolderTab>
        <FolderTab value="preview" disabled>
          Preview
        </FolderTab>
      </FolderTabsRail>

      <FolderTabsPanel value="rules">The rules panel.</FolderTabsPanel>
      <FolderTabsPanel value="dates">The dates panel.</FolderTabsPanel>
      <FolderTabsPanel value="preview">Not reachable while disabled.</FolderTabsPanel>
    </FolderTabs>
  );
}
```

You do not have to control it. `@radix-ui/react-tabs` is underneath, so
`defaultValue` works if you would rather it manage its own state:

```tsx
<FolderTabs defaultValue="rules">…</FolderTabs>
```

Everything else — roving focus, arrow keys with wraparound, Home and End,
skipping the disabled tab, `aria-controls` wiring — is already handled. You do
not write a keyboard handler.

Remember to import `folder-tabs.css` once at the root of the app. Without it the
components render as unstyled buttons and divs, and the mechanic does not exist.

### With a flush panel

`flush` is for a panel whose content brings its own card, table, or grid with its
own padding. It reduces the panel's padding but keeps the ground and the side
walls:

```tsx
<FolderTabsPanel value="dates" flush>
  <DataGrid rows={rows} />
</FolderTabsPanel>
```

## CSS only

If something else in your application already owns tab state, you write the same
markup as the vanilla path and skip the script. The stylesheet reads exactly two
attributes:

```html
<div class="fldr-rail" role="tablist" aria-label="Sections">
  <div class="fldr-scroll">
    <button class="fldr-tab" data-state="active">Rules</button>
    <button class="fldr-tab" data-state="inactive">Dates</button>
  </div>
</div>

<div class="fldr-panel">The rules panel.</div>
```

- `data-state="active"` on the selected `.fldr-tab` gives it the panel fill and
  the extra height.
- `data-overflowing="true"` on `.fldr-arrows` reveals the arrow buttons. Without
  it they stay `display: none`.

That is the entire contract between your code and the stylesheet. Everything
else — which panel is visible, what the keyboard does, what a screen reader is
told — is yours to implement on this path. See
[Accessibility](/guide/accessibility) for what you are signing up for.

## What to check before you call it done

1. **Tab through it.** Focus should enter the strip once, land on the selected
   tab, and leave on the next Tab press.
2. **Arrow through it.** Left and right should move selection and wrap around;
   disabled tabs should be skipped.
3. **Narrow the window** until the tabs overflow. The arrows should appear inside
   the rail and disable at each end.
4. **Switch to dark mode.** The selected tab must still be the _lightest_ of the
   three fills. If it went darker, read [the dark-mode trap](/guide/theming#the-dark-mode-trap).
5. **Screenshot it and desaturate the image.** You should still be able to tell
   which tab is selected. If you cannot, something in the fill relationship has
   been overridden.
