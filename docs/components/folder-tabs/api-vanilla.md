# Vanilla API

`components/folder-tabs/vanilla/folder-tabs.js` — one exported function, zero dependencies, a standard
ES module.

```js
import { initFolderTabs } from "./vanilla/folder-tabs.js";
initFolderTabs();
```

A default export is also available for convenience:

```js
import initFolderTabs from "./vanilla/folder-tabs.js";
```

## `initFolderTabs(root?)`

```ts
function initFolderTabs(root?: ParentNode): () => void;
```

| Parameter | Type         | Default    | Description                                        |
| --------- | ------------ | ---------- | -------------------------------------------------- |
| `root`    | `ParentNode` | `document` | The subtree to scan for `[data-folder-tabs]` hosts |

**Returns** a teardown function that removes every listener and observer attached
by that call.

Three properties worth relying on:

**It is idempotent.** Hosts it has already wired are remembered and skipped, so
calling it twice does not double-bind anything. After injecting new markup you
can simply call it again with no argument.

**It returns a teardown.** In a single-page app that unmounts the markup, call it
before removing the DOM:

```js
const teardown = initFolderTabs(container);
// later
teardown();
```

Tearing down also forgets the hosts, so a later `initFolderTabs()` will wire them
again if they are still on the page.

**It applies the starting state rather than trusting it.** After wiring, it runs
a selection pass using whichever tab carries `data-state="active"` (or the first
tab if none does), so `aria-selected`, the roving `tabindex`, and the panels'
`hidden` attributes are guaranteed correct even if your server-rendered HTML got
one of them wrong.

## The markup contract

This build **reads** your markup rather than generating it, so the structure has
to be right. Requirements marked _direct child_ are enforced with `:scope >`
selectors — that is what stops an outer control from adopting a nested control's
tabs.

```html
<div data-folder-tabs>
  <div class="fldr-rail" role="tablist" aria-label="Sections">
    <div class="fldr-scroll">
      <button
        class="fldr-tab"
        role="tab"
        id="t1"
        aria-controls="p1"
        data-state="active"
        aria-selected="true"
      >
        Rules
      </button>
      <button
        class="fldr-tab"
        role="tab"
        id="t2"
        aria-controls="p2"
        data-state="inactive"
        aria-selected="false"
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

  <div class="fldr-panel" id="p1" role="tabpanel" aria-labelledby="t1" tabindex="0">…</div>
  <div class="fldr-panel" id="p2" role="tabpanel" aria-labelledby="t2" tabindex="0" hidden>…</div>
</div>
```

| Element        | Requirement                                                                                                                       |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| The host       | Any element with `data-folder-tabs`                                                                                               |
| `.fldr-rail`   | **Direct child** of the host. `role="tablist"` and an `aria-label`                                                                |
| `.fldr-scroll` | **Direct child** of the rail                                                                                                      |
| `.fldr-tab`    | **Direct child** of `.fldr-scroll`. A `button` with `role="tab"`, a unique `id`, and `aria-controls` pointing at its panel's `id` |
| `.fldr-arrows` | **Optional.** Direct child of the rail, after the strip                                                                           |
| `.fldr-arrow`  | Two buttons inside it, with `data-dir="-1"` and `data-dir="1"`, both `tabindex="-1"` and labelled                                 |
| `.fldr-panel`  | Anywhere inside the host, with a matching `id`, `role="tabpanel"`, `aria-labelledby` back to its tab, and `tabindex="0"`          |
| Initial state  | `data-state="active"` on exactly one tab; `hidden` on every panel except that one                                                 |

If nothing matching `[role="tab"]` is found inside `.fldr-scroll`, setup exits
quietly and that host is left alone. If `.fldr-arrows` is absent, everything else
still works — you simply have no arrow buttons.

### Why the pairing is not optional

`aria-controls` is not decoration here — it is the only way the script finds the
panel to show. A tab wired without it will still select and style correctly, but
**no panel will be shown or hidden**.

The build treats that as a deliberate case rather than an error: it only touches
a panel a tab actually owns. An earlier version hid the outgoing panel
unconditionally, which meant one tab missing `aria-controls` could leave the rail
floating above nothing — the mechanic gone, which is precisely the failure this
control exists to prevent.

The `aria-labelledby` on the panel is what a screen reader reads. Without it the
panel is an anonymous div.

## Data attributes

| Attribute          | On             | Written by | Values                         |
| ------------------ | -------------- | ---------- | ------------------------------ |
| `data-folder-tabs` | The host       | You        | Presence only                  |
| `data-state`       | `.fldr-tab`    | The script | `"active"` \| `"inactive"`     |
| `data-dir`         | `.fldr-arrow`  | You        | `"-1"` (left) \| `"1"` (right) |
| `data-overflowing` | `.fldr-arrows` | The script | `"true"` \| `"false"`          |

`data-state` also seeds the initial selection, so it is both an input at startup
and an output thereafter.

## Disabled tabs

Two spellings, both honoured, and they are not the same thing:

|                        | `disabled` | `aria-disabled="true"` |
| ---------------------- | ---------- | ---------------------- |
| Focusable              | No         | **Yes**                |
| Skipped by arrow keys  | Yes        | Yes                    |
| Refuses to activate    | Yes        | Yes                    |
| Styled `opacity: 0.45` | Yes        | Yes                    |

`aria-disabled` is the WAI-ARIA preference, because it keeps the tab reachable so
a screen reader user can find it and be told why it is unavailable. Use native
`disabled` when the tab is genuinely not part of the current task. See
[two kinds of disabled](/components/folder-tabs/accessibility#two-kinds-of-disabled).

Internally both are collapsed into one check, so anything that skips a disabled
tab skips either spelling.

## Keyboard

Handled by one delegated `keydown` listener on the strip.

| Key                                 | Behaviour                                 |
| ----------------------------------- | ----------------------------------------- |
| <kbd>→</kbd>                        | Next usable tab, wrapping to the first    |
| <kbd>←</kbd>                        | Previous usable tab, wrapping to the last |
| <kbd>Home</kbd>                     | First usable tab                          |
| <kbd>End</kbd>                      | Last usable tab                           |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | Activate the focused tab                  |

Movement keys select **and** focus. <kbd>Enter</kbd> and <kbd>Space</kbd> select
without moving focus, and are ignored on an `aria-disabled` tab — which can
receive the keypress, since it is still focusable.

Every handled key calls `preventDefault()`, so <kbd>Space</kbd> does not also
scroll the page.

## The `folder-tabs:change` event

Every selection dispatches a bubbling `CustomEvent` on the host:

```js
document.addEventListener("folder-tabs:change", (event) => {
  const { index, tab, panel } = event.detail;
  console.log("selected", index, tab.textContent);
});
```

| `detail` | Type                  | Description                                               |
| -------- | --------------------- | --------------------------------------------------------- |
| `index`  | `number`              | Zero-based index of the selected tab within its own strip |
| `tab`    | `HTMLElement`         | The selected tab                                          |
| `panel`  | `HTMLElement \| null` | Its panel, or `null` if the tab has no `aria-controls`    |

It bubbles, so you can listen on `document` and handle every control on the page
from one place. Note that it also fires **once during setup**, when the starting
state is applied — if you only want user-driven changes, ignore the first event
per host or attach the listener after `initFolderTabs()` returns.

## Overflow behaviour

The arrows appear only on real overflow and disable at each end rather than
disappearing:

```js
const max = strip.scrollWidth - strip.clientWidth;
arrows.dataset.overflowing = String(max > 1);
left.disabled = strip.scrollLeft <= 1;
right.disabled = strip.scrollLeft >= max - 1;
```

A click scrolls by `Math.max(140, strip.clientWidth * 0.7)`. Measurement is
re-run on scroll, on window resize, and through a `ResizeObserver` watching the
strip and every tab — throttled to one measurement per animation frame, because
`scrollWidth` forces layout and reading it on every scroll event makes a smooth
strip feel slow.

Full reasoning: [Overflow](/components/folder-tabs/overflow).

## Revealing the focused tab

```js
const pad = 12;
const left = tab.offsetLeft - pad;
const right = tab.offsetLeft + tab.offsetWidth + pad;
if (left < strip.scrollLeft) strip.scrollLeft = left;
else if (right > strip.scrollLeft + strip.clientWidth) {
  strip.scrollLeft = right - strip.clientWidth;
}
```

`scrollIntoView()` is deliberately not used: it walks every scrollable ancestor
including the document, so arrow-keying along a tab strip can jump the whole
page. Moving the strip's own `scrollLeft` touches exactly one scroll container.

## Nesting

Put another `[data-folder-tabs]` host inside a panel and add `fldr-nested` to it.
`initFolderTabs()` finds nested hosts on its own, and the `:scope >` selectors
keep each control's tabs to itself.

Give the nested `role="tablist"` its own `aria-label`. See
[Nesting](/components/folder-tabs/nesting#vanilla-nesting).

## Browser requirements

| Feature           | Used for                                                                                                                         |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| ES modules        | The import itself                                                                                                                |
| `Element.closest` | Delegated click and keydown handling                                                                                             |
| `CSS.escape`      | Building the `#id` selector for a panel safely                                                                                   |
| `ResizeObserver`  | Re-measuring overflow. **Optional** — guarded by `if (window.ResizeObserver)`, and scroll/resize handling still works without it |
| `WeakSet`         | The idempotence guard                                                                                                            |
