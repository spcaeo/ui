# Accessibility

Both the React and vanilla builds implement the full
[ARIA tab pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/). This page
describes what that means in practice, what you get for free, and what you take
on if you use the CSS-only path.

A note on why this matters here in particular: this control was built for a
product where different roles see different screens and being on the wrong tab
has consequences. A tab strip a keyboard user cannot navigate, or that a screen
reader describes as "button, button, button", is not a cosmetic problem — it is a
person unable to reach half the application.

## Roles and relationships

| Element       | Role                      | Required attributes                                       |
| ------------- | ------------------------- | --------------------------------------------------------- |
| `.fldr-rail`  | `tablist`                 | `aria-label` (or `aria-labelledby`) naming the group      |
| `.fldr-tab`   | `tab`                     | `id`, `aria-controls`, `aria-selected`, roving `tabindex` |
| `.fldr-panel` | `tabpanel`                | `id`, `aria-labelledby`, `tabindex="0"`                   |
| `.fldr-arrow` | _(none — a plain button)_ | `aria-label`, `tabindex="-1"`                             |

The pairing runs both ways. Each tab's `aria-controls` points at its panel's
`id`; each panel's `aria-labelledby` points back at its tab's `id`. That is what
lets a screen reader announce "Rules, tab, 1 of 3, selected" and then, when the
user moves into the panel, name the panel without you writing the name twice.

`aria-selected` is not the same thing as `data-state`. `data-state` drives the
CSS; `aria-selected` drives assistive technology. Both builds keep them in sync
on every selection change, and on the CSS-only path you must set both.

**Give the `tablist` a name.** `aria-label="Sections"` is enough. Without it, a
screen reader user landing on the strip hears "tab list" with no indication of
what is being switched — and if a page has two tab strips, which is common as
soon as you [nest](/guide/nesting), they are indistinguishable.

## Keyboard

| Key                                 | What happens                                                                                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| <kbd>Tab</kbd>                      | Moves focus **into** the strip, landing on the selected tab — or, from the selected tab, **out** of the strip to the next focusable element |
| <kbd>→</kbd>                        | Selects and focuses the next tab, wrapping from the last to the first                                                                       |
| <kbd>←</kbd>                        | Selects and focuses the previous tab, wrapping from the first to the last                                                                   |
| <kbd>Home</kbd>                     | Selects and focuses the first usable tab                                                                                                    |
| <kbd>End</kbd>                      | Selects and focuses the last usable tab                                                                                                     |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | Activates the focused tab                                                                                                                   |

Disabled tabs are skipped by every one of those movements. Arrow keys step over
them, and <kbd>Home</kbd>/<kbd>End</kbd> land on the first or last tab that is
_not_ disabled rather than on a dead one.

Selection follows focus — arrowing to a tab selects it immediately, which is the
APG's recommended behaviour for panels whose content is already present and cheap
to show. If your panels are expensive to render, the React build inherits Radix's
`activationMode="manual"`, which makes arrow keys move focus only and leaves
<kbd>Enter</kbd>/<kbd>Space</kbd> to commit.

## Two kinds of disabled

The vanilla build treats these as different things, and the difference is worth
understanding because the accessible choice is the less obvious one:

|                       | `disabled` | `aria-disabled="true"` |
| --------------------- | ---------- | ---------------------- |
| Focusable             | No         | **Yes**                |
| Reachable by keyboard | No         | Yes                    |
| Skipped by arrow keys | Yes        | Yes                    |
| Refuses to activate   | Yes        | Yes                    |
| WAI-ARIA preference   | —          | **Preferred**          |

A natively `disabled` button is removed from the page as far as the keyboard is
concerned. A screen reader user arrowing along the strip never encounters it and
so never learns it exists — which is a problem if the reason it is disabled is
something they could act on ("Preview is unavailable until you save").

`aria-disabled="true"` keeps the tab focusable, so it can be found and announced
as unavailable, while still refusing to activate. Prefer it when the user might
reasonably want to know why. Use native `disabled` when the tab is genuinely not
part of the current task.

Both are skipped by arrow-key _movement_ in the vanilla build, so neither
obstructs navigation, and the stylesheet renders them identically —
`.fldr-tab:disabled` and `.fldr-tab[aria-disabled="true"]` share one rule, in
normal mode and in forced-colors mode. The user sees one "unavailable" state; the
difference is purely in whether the tab can be reached.

## Roving tabindex

Only **one** tab is in the document's tab sequence at any moment: the selected
one has `tabindex="0"`, every other tab has `tabindex="-1"`.

This is the difference between a tab strip that is pleasant with a keyboard and
one that is exhausting. Without it, a strip of eight tabs puts eight
<kbd>Tab</kbd> presses between the user and the panel content. With it,
<kbd>Tab</kbd> treats the whole strip as a single stop — enter, arrow within,
<kbd>Tab</kbd> again to leave — which is how every native tab control on every
platform behaves.

Both builds maintain this automatically. The vanilla build sets it on
initialisation from `data-state` and updates it on every selection; the React
build gets it from Radix.

## The arrows are not tabs

`.fldr-arrow` buttons carry `tabindex="-1"` and no tab role. They are scroll
controls — furniture for the strip, not destinations in it.

If they were in the tab sequence, a keyboard user moving from the strip to the
panel would hit two extra stops that do nothing for them, since the arrow keys
already reach every tab regardless of whether it is currently scrolled into view.
Keeping them out costs no functionality.

They keep their `aria-label`s ("Scroll tabs left" / "Scroll tabs right") because
they are still reachable in a screen reader's browse mode, and an unlabelled
button there announces as "button", which is worse than useless. The chevrons
themselves are inline SVG marked `aria-hidden="true"` and `focusable="false"`, so
they add nothing to the accessibility tree.

## Focus is revealed, not scrolled-into-view

When the strip overflows and the user arrows to a tab beyond the visible edge,
both builds bring it into view. Note _how_:

```js
const pad = 12;
const left = tab.offsetLeft - pad;
const right = tab.offsetLeft + tab.offsetWidth + pad;
if (left < strip.scrollLeft) strip.scrollLeft = left;
else if (right > strip.scrollLeft + strip.clientWidth) {
  strip.scrollLeft = right - strip.clientWidth;
}
```

The obvious implementation is `tab.scrollIntoView()`, and both builds
deliberately avoid it. `scrollIntoView` walks **every** scrollable ancestor,
including the document, so arrow-keying along a tab strip that happens to sit
below the fold can jump the whole page vertically. That is a worse bug than the
one it fixes. Moving the strip's own `scrollLeft` touches exactly one scroll
container.

Either way, the underlying requirement is not optional. Without it, arrow-keying
past the visible edge moves focus to an element the user cannot see: sighted
keyboard users lose the cursor, and users with a screen magnifier lose their
place entirely. It is the specific failure that makes a scrolling tab strip
unusable by keyboard.

The `12px` padding is so the revealed tab is not flush against the edge of the
strip, where it reads as clipped rather than as fully arrived.

## Panels are focusable

Each `.fldr-panel` has `tabindex="0"`, so <kbd>Tab</kbd> from the selected tab
moves into the panel itself.

This is the APG recommendation for panels that may not contain a focusable
element. Without it, a panel of plain text is unreachable by keyboard — the user
tabs from the strip straight past the content to whatever follows, and a screen
reader user has no landmark to move into. With it, the panel takes focus, its
accessible name (from `aria-labelledby`) is announced, and its content is read.

The focus ring on a focused panel uses `--tab-ring-on-panel`, a separate variable
from the ring on inactive tabs, because a ring colour that reads against a dark
inactive tab is invisible against a light panel. See
[Theming](/guide/theming#why-the-focus-ring-is-two-variables).

## Reduced motion

Two things in the stylesheet animate: `.fldr-tab` transitions its background,
colour, and padding over 120ms, and `.fldr-scroll` has `scroll-behavior: smooth`
so the overflow arrows glide rather than jump.

The stylesheet already turns both off when the user asks:

```css
@media (prefers-reduced-motion: reduce) {
  .fldr-tab {
    transition: none;
  }
  .fldr-scroll {
    scroll-behavior: auto;
  }
}
```

You do not need to add anything. The smooth horizontal scroll is the one that
matters — a sideways glide is exactly the kind of movement that can be
uncomfortable for someone with a vestibular disorder — and nothing about the
mechanic depends on either animation. With motion reduced, the arrows still
scroll the strip, they just arrive immediately.

## Forced colors

Windows High Contrast Mode (exposed to CSS as `forced-colors: active`) replaces
author colours with a small system palette. That is a genuine test for this
control, because its primary state signal _is_ a fill relationship — and in
forced-colors mode the fills are no longer yours to set.

The stylesheet handles this by conceding the point and falling back to the other
half of the control:

```css
@media (forced-colors: active) {
  .fldr-tab {
    filter: none;
    border: 1px solid ButtonBorder;
    forced-color-adjust: none;
    background: ButtonFace;
    color: ButtonText;
  }
  .fldr-tab[data-state="active"] {
    background: Highlight;
    color: HighlightText;
  }
  .fldr-tab:disabled {
    color: GrayText;
    opacity: 1;
  }
  .fldr-panel {
    border: 1px solid ButtonBorder;
  }
  .fldr-tab:focus-visible,
  .fldr-arrow:focus-visible {
    outline: 2px solid CanvasText;
  }
}
```

Three decisions in there are worth explaining.

**`filter: none` on the tab.** The edge stroke is drawn with `drop-shadow()`
filters, and in forced-colors mode those would paint in a colour the OS has not
sanctioned. The filter is dropped and a real `1px solid ButtonBorder` takes over
— which works here because forced-colors overrides the fills anyway, so the
`clip-path`-eats-the-border problem is no longer worth solving.

**`Highlight` on the active tab.** This is the opposite of what the mechanic
would suggest — `Highlight` is a _selection_ colour, and using it turns identity
back into annotation. It is the right call anyway, because in forced-colors mode
the fill-identity mechanic is gone by definition: you cannot make the tab and the
panel share a fill when the OS is choosing both. `Highlight` on a selected item
is what the platform's own controls do and what its users expect.

**`opacity: 1` on disabled tabs.** Forced-colors mode has an explicit keyword for
this state, `GrayText`, which is more reliable than a transparency trick. Using
the system's own signal is better than approximating it.

The geometry survives all of this untouched. The active tab is still taller,
still trapezoidal, still cut into the panel with no line across the join.
`clip-path` is shape, not colour, so forced-colors does not flatten it.

## Print

The stylesheet also handles printing:

```css
@media print {
  .fldr-arrows {
    display: none !important;
  }
  .fldr-scroll {
    overflow: visible;
  }
  .fldr-panel[hidden] {
    display: none;
  }
}
```

Scroll arrows are meaningless on paper, and a strip that scrolls on screen must
lay out fully on the page rather than clipping the tabs that were off-view. This
is the same argument as [the greyscale test](/guide/the-mechanic#the-greyscale-test)
— printed output is a real output, and the control is designed to survive it.

## If you are on the CSS-only path

The stylesheet gives you appearance. Everything on this page is yours to
implement. At minimum:

1. `role="tablist"` on the rail with an `aria-label`.
2. `role="tab"`, `id`, `aria-controls`, and `aria-selected` on every tab.
3. `role="tabpanel"`, `id`, `aria-labelledby`, and `tabindex="0"` on every panel,
   with `hidden` on the inactive ones.
4. Roving `tabindex` — `0` on the selected tab, `-1` on the others.
5. A `keydown` handler for <kbd>←</kbd>, <kbd>→</kbd>, <kbd>Home</kbd>,
   <kbd>End</kbd>, <kbd>Enter</kbd> and <kbd>Space</kbd> that skips disabled tabs
   and wraps around.
6. Revealing the focused tab by adjusting the strip's `scrollLeft`.
7. `data-state` and `aria-selected` kept in sync — two audiences reading the same
   fact.

If that list looks like work, `vanilla/folder-tabs.js` is that list, in about two
hundred lines, with no dependencies. Consider using it.

## Testing

- **Keyboard only.** Unplug the mouse. Reach every tab, every panel, and the
  content after the control.
- **Screen reader.** VoiceOver on macOS, NVDA on Windows. You should hear the tab
  list's name, each tab's position ("2 of 4"), its selected state, and the
  panel's name on entering it.
- **Narrow viewport.** Overflow arrows appear; arrow-keying keeps focus visible.
- **Zoom to 200%.** Text stays legible and the strip scrolls rather than clips.
- **Dark mode.** The selected tab is still the lightest of the three fills.
- **Greyscale.** Covered in [The Mechanic](/guide/the-mechanic#the-greyscale-test),
  and it is an accessibility test as much as a design one.
